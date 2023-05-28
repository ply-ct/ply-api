import { existsSync, promises as fs } from 'fs';
import fetch from 'cross-fetch';
import { Repository, GitHubOptions } from '../model/github';
import { FileListOptions, FileList, FileAccess } from '../model/files';
import { Exec } from '../util/exec';
import { FileSystemAccess } from '../util/files';
import { StatusError } from '../model/request';
import { plyApiVersion } from '../versions';
import { isMatch } from '../util/match';

// TODO shallow clone
export class GitHubAccess implements FileAccess {
    static readonly graphQlUrl = 'https://api.github.com/graphql';

    readonly repository: Repository;
    private authUrl?: URL;
    private clonedOrPulled = false;

    constructor(readonly options: GitHubOptions) {
        // https://github.com/ply-ct/ply-demo
        if (options.url.endsWith('/')) {
            options.url = options.url.substring(0, options.url.length - 1);
        }
        const url = new URL(options.url);
        const pathSlash = url.pathname.indexOf('/', 1);
        const repoPath = options.url.substring(19);
        this.repository = {
            url: options.url,
            owner: url.pathname.substring(1, pathSlash).toLowerCase(),
            name: url.pathname.substring(pathSlash + 1),
            branch: options.branch,
            apiUrl: `https://api.github.com/repos/${repoPath}`,
            rawContentUrl: `https://raw.githubusercontent.com/${repoPath}/${options.branch}`
        };
        if (options.token) {
            this.authUrl = new URL(
                `https://${options.user}:${options.token}@github.com/${repoPath}.git`
            );
        }
    }

    /**
     * If defined, indicates git local clone
     */
    get repoDir(): string | undefined {
        if (this.options.reposDir) {
            return `${this.options.reposDir}/${this.repository.name}`;
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
            await this.runGit(`clone ${this.authUrl || this.options.url} ${repoDir}`, '.', msg);
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
        const branch = this.options.branch || repo.default_branch;
        this.repository.branch = branch;
        this.repository.rawContentUrl = `https://raw.githubusercontent.com/${this.repository.owner}/${this.repository.name}/${branch}`;
        const repoBranch = await this.doGet(`branches/${branch}`);
        this.repository.lastCommit = new Date(repoBranch.commit.commit.committer.date);
    }

    async listFiles(relPath: string, options?: FileListOptions): Promise<string[]> {
        if (this.repoDir) {
            await this.cloneOrPull(this.repoDir);
            return await new FileSystemAccess(this.repoDir).listFiles(relPath, options);
        } else {
            // TODO: one request? paginated?
            const filePaths: string[] = [];
            try {
                const items = await this.doGet(`contents/${relPath}`);
                if (!Array.isArray(items)) {
                    throw new Error(`Expected 'array' instead of '${typeof items}': ${relPath}`);
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

    async getFileList(relPath: string, options?: FileListOptions): Promise<FileList> {
        if (this.repoDir) {
            await this.cloneOrPull(this.repoDir);
            return await new FileSystemAccess(this.repoDir).getFileList(relPath, options);
        } else {
            const fileList: FileList = {};
            const filePaths = await this.listFiles(relPath, options);
            for (const filePath of filePaths) {
                fileList[filePath] = await this.getTextFileContent(filePath);
            }
            return fileList;
        }
    }

    async readTextFile(relPath: string): Promise<string | undefined> {
        if (this.repoDir) {
            await this.cloneOrPull(this.repoDir);
            const file = `${this.repoDir}/${relPath}`;
            if (existsSync(file)) {
                return await fs.readFile(file, { encoding: 'utf8' });
            }
        } else {
            try {
                return await this.getTextFileContent(relPath);
            } catch (err: any) {
                if (err.status !== 404) throw err;
            }
        }
    }

    async getTextFileContent(relPath: string): Promise<string> {
        if (this.repoDir) {
            await this.cloneOrPull(this.repoDir);
            return await fs.readFile(`${this.repoDir}/${relPath}`, { encoding: 'utf8' });
        } else {
            const file = await this.doGet(`contents/${relPath}`);
            if (typeof file !== 'object') {
                throw new Error(`Expected 'object' instead of '${typeof file}': ${relPath}`);
            }
            if (file.type !== 'file') {
                throw new Error(`Unexpected response type '${file.type}': ${relPath}`);
            }

            if (file.encoding === 'none') {
                this.options.logger.error(`Cannot download large file: ${relPath}`);
                return '';
            }

            return Buffer.from(file.content, file.encoding).toString();
        }
    }

    async runGit(cmd: string, cwd: string, msg?: string): Promise<string> {
        return await new Exec({ cwd, message: msg, logger: this.options.logger }).run(`git ${cmd}`);
    }

    /**
     * Returns an array of objects or an object.
     */
    async doGet(path: string): Promise<any> {
        let url = this.repository.apiUrl;
        if (path) url += `/${path}`;
        if (this.options.verbose) {
            this.options.logger.log(`Invoking GET ${url}`);
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                ...(this.options.token && { Authorization: `Bearer ${this.options.token}` }),
                'User-Agent': `ply-api ${plyApiVersion}`
            }
        });
        if (response.ok) {
            return await response.json();
        } else {
            if (this.options.verbose) {
                this.options.logger.error('GitHub response', await response.json());
            }
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
        if (this.options.verbose) {
            this.options.logger.log(`Invoking POST ${GitHubAccess.graphQlUrl}`);
        }
        const response = await fetch(GitHubAccess.graphQlUrl, {
            method: 'POST',
            headers: {
                ...(this.options.token && { Authorization: `Bearer ${this.options.token}` }),
                'User-Agent': `ply-api ${plyApiVersion}`,
                'Content-Type': 'application/graphql'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            if (this.options.verbose) {
                this.options.logger.error('GitHub response', await response.text());
            }
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
