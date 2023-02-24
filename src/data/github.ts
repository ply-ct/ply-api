import { existsSync, promises as fs } from 'fs';
import fetch from 'cross-fetch';
import { Repository } from '../model/github';
import { FileListOptions, FileList, FileAccess } from '../model/files';
import { Exec } from '../util/exec';
import { FileSystemAccess } from '../util/files';
import { StatusError } from '../model/api';
import { apiVersion } from '../versions';
import { isMatch } from '../util/match';

export interface GitHubConfig {
    /**
     * GitHub web url
     * (eg: https://github.com/ply-ct/ply-demo)
     */
    url: string;
    /**
     * If not specified, use default branch
     */
    branch?: string;
    /**
     * Needed for non-public apis
     */
    token?: string;
    user?: string;
    reposDir?: string;
    verbose?: boolean;
}

// TODO shallow clone
export class GitHubAccess implements FileAccess {
    static readonly graphQlUrl = 'https://api.github.com/graphql';

    readonly repository: Repository;
    private authUrl?: URL;
    private clonedOrPulled = false;

    constructor(readonly config: GitHubConfig) {
        // https://github.com/ply-ct/ply-demo
        if (config.url.endsWith('/')) config.url = config.url.substring(0, config.url.length - 1);
        const url = new URL(config.url);
        const pathSlash = url.pathname.indexOf('/', 1);
        const repoPath = config.url.substring(19);
        this.repository = {
            url: config.url,
            owner: url.pathname.substring(1, pathSlash).toLowerCase(),
            name: url.pathname.substring(pathSlash + 1),
            branch: config.branch,
            apiUrl: `https://api.github.com/repos/${repoPath}`,
            rawContentUrl: `https://raw.githubusercontent.com/${repoPath}/${config.branch}`
        };
        if (config.token) {
            this.authUrl = new URL(
                `https://${config.user}:${config.token}@github.com/${repoPath}.git`
            );
        }
    }

    /**
     * If defined, indicates git local clone
     */
    get repoDir(): string | undefined {
        if (this.config.reposDir) {
            return `${this.config.reposDir}/${this.repository.name}`;
        }
    }

    async cloneOrPull(repoDir: string) {
        if (this.clonedOrPulled) return;
        if (existsSync(repoDir)) {
            // pull
            await this.runGit('pull', repoDir);
        } else {
            // clone
            let msg: string | undefined;
            if (this.authUrl) {
                const safeUrl = `${this.authUrl.protocol}//${this.authUrl.username}:********@${this.authUrl.host}${this.authUrl.pathname}`;
                msg = `Running: 'clone ${safeUrl} ${repoDir}'`;
            }
            await this.runGit(`clone ${this.authUrl || this.config.url} ${repoDir}`, '.', msg);
        }
        await this.runGit(`checkout ${this.repository.branch} --`, repoDir);
        this.clonedOrPulled = true;
    }

    /**
     * Populates repository.branch and repository.dates.
     * Always uses GitHub API.
     */
    async init() {
        const repo = await this.doGet('');
        this.repository.created = new Date(repo.created_at);
        const branch = this.config.branch || repo.default_branch;
        this.repository.branch = branch;
        this.repository.rawContentUrl = `https://raw.githubusercontent.com/${this.repository.owner}/${this.repository.name}/${branch}`;
        const repoBranch = await this.doGet(`branches/${branch}`);
        this.repository.lastCommit = new Date(repoBranch.commit.commit.committer.date);
    }

    async listFiles(dirPath: string, options?: FileListOptions): Promise<string[]> {
        if (this.repoDir) {
            await this.cloneOrPull(this.repoDir);
            return await new FileSystemAccess().listFiles(dirPath, options);
        } else {
            const filePaths: string[] = [];
            try {
                const items = await this.doGet(`contents/${dirPath}`);
                if (!Array.isArray(items)) {
                    throw new Error(`Expected 'array' instead of '${typeof items}': ${dirPath}`);
                }
                for (const item of items) {
                    if (item.type === 'file') {
                        if (!options?.patterns || isMatch(item.path, options.patterns)) {
                            filePaths.push(item.path);
                        }
                    } else if (item.type === 'dir' && options?.recursive) {
                        filePaths.push(...(await this.listFiles(item.path, options)));
                    }
                }
            } catch (err: any) {
                if (err.status !== 404) {
                    throw err;
                }
            }
            return filePaths;
        }
    }

    async getFileList(dirPath: string, options?: FileListOptions): Promise<FileList> {
        if (this.repoDir) {
            await this.cloneOrPull(this.repoDir);
            return await new FileSystemAccess().getFileList(dirPath, options);
        } else {
            const fileList: FileList = {};
            const filePaths = await this.listFiles(dirPath, options);
            for (const filePath of filePaths) {
                fileList[filePath] = await this.getTextFileContent(filePath);
            }
            return fileList;
        }
    }

    async readTextFile(filePath: string): Promise<string | undefined> {
        if (this.repoDir) {
            await this.cloneOrPull(this.repoDir);
            const file = `${this.repoDir}/${filePath}`;
            if (existsSync(file)) {
                return await fs.readFile(file, { encoding: 'utf8' });
            }
        } else {
            try {
                return await this.getTextFileContent(filePath);
            } catch (err: any) {
                if (err.status !== 404) throw err;
            }
        }
    }

    async getTextFileContent(filePath: string): Promise<string> {
        if (this.repoDir) {
            await this.cloneOrPull(this.repoDir);
            return await fs.readFile(`${this.repoDir}/${filePath}`, { encoding: 'utf8' });
        } else {
            const file = await this.doGet(`contents/${filePath}`);
            if (typeof file !== 'object') {
                throw new Error(`Expected 'object' instead of '${typeof file}': ${filePath}`);
            }
            if (file.type !== 'file') {
                throw new Error(`Unexpected response type '${file.type}': ${filePath}`);
            }

            if (file.encoding === 'none') {
                console.error(`Cannot download large file: ${filePath}`);
                return '';
            }

            return Buffer.from(file.content, file.encoding).toString();
        }
    }

    async runGit(cmd: string, cwd: string, msg?: string): Promise<string> {
        return await new Exec({ cwd, message: msg }).run(`git ${cmd}`);
    }

    /**
     * Returns an array of objects or an object.
     */
    async doGet(path: string): Promise<any> {
        let url = this.repository.apiUrl;
        if (path) url += `/${path}`;
        if (this.config.verbose) console.log(`Invoking GET ${url}`);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                ...(this.config.token && { Authorization: `Bearer ${this.config.token}` }),
                'User-Agent': `ply-api ${apiVersion}`
            }
        });
        if (response.ok) {
            return await response.json();
        } else {
            if (this.config.verbose) console.error('GitHub response', await response.json());
            throw new StatusError(
                response.status,
                `Bad GitHub Response -> ${url}: ${response.status}`
            );
        }
    }

    /**
     * Returns an array of objects or an object.
     */
    async doGraphQlPost(query: string): Promise<any> {
        if (this.config.verbose) console.log(`Invoking POST ${GitHubAccess.graphQlUrl}`);
        const response = await fetch(GitHubAccess.graphQlUrl, {
            method: 'POST',
            headers: {
                ...(this.config.token && { Authorization: `Bearer ${this.config.token}` }),
                'User-Agent': `ply-api ${apiVersion}`,
                'Content-Type': 'application/graphql'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            if (this.config.verbose) console.error('GitHub response', await response.text());
            throw new Error(
                `Bad GitHub Response -> ${GitHubAccess.graphQlUrl}: ${JSON.stringify(
                    response.status
                )}`
            );
        }
        return await response.json();
    }

    static getRepositoryName(repoUrl: string): string {
        const url = new URL(repoUrl);
        const pathSlash = url.pathname.indexOf('/', 1);
        return url.pathname.substring(pathSlash + 1);
    }
}
