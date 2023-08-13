import fetch from 'cross-fetch';
import { Repository, GitHubOptions, LocalRepository } from '../model/github';
import { FileListOptions, FileList, FileAccess, DirOptions } from '../model/files';
import { StatusError } from '../model/request';
import { plyApiVersion } from '../version';
import { isMatch } from '../util/match';

export class GitHubAccess implements FileAccess {
    static readonly graphQlUrl = 'https://api.github.com/graphql';

    readonly repository: Repository;
    private authUrl?: URL;
    private pulledBranch?: string;

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

    async exists(path: string): Promise<boolean> {
        const localRepo = this.options.localRepository;
        if (localRepo) {
            await this.pullBranch(localRepo);
            return await localRepo.fileSystem.exists(path);
        } else {
            const response = await fetch(`${this.repository.apiUrl}/contents/${path}`, {
                method: 'GET',
                headers: {
                    ...(this.options.token && { Authorization: `Bearer ${this.options.token}` }),
                    'User-Agent': `ply-api ${plyApiVersion}`
                }
            });
            return response.ok;
        }
    }

    async createDir(_path: string, _options?: DirOptions) {
        throw new Error('createDir not supported for GitHub remote');
    }

    async deleteDir(_path: string, _options?: DirOptions | undefined) {
        throw new Error('dirDir not supported for GitHub remote');
    }

    async pullBranch(localRepo: LocalRepository) {
        if (!this.repository.branch) {
            throw new Error(`No branch specified: ${this.repository.url}`);
        }
        if (this.pulledBranch === this.repository.branch) return;

        this.pulledBranch = this.repository.branch;

        let repoExists = await localRepo.fileSystem.exists('.');
        if (repoExists && this.repository.branch !== (await this.getCurrentBranch(localRepo.dir))) {
            // remove and re-pull
            await localRepo.fileSystem.deleteDir('.', { recursive: true });
            repoExists = false;
        }

        if (!repoExists) {
            await localRepo.fileSystem.createDir('.', { recursive: true });
            await this.runGit(`init -b ${this.pulledBranch}`, localRepo.dir);
        }

        let msg: string | undefined;
        if (this.authUrl) {
            const safeUrl = `${this.authUrl.protocol}//${this.authUrl.username}:********@${this.authUrl.host}${this.authUrl.pathname}`;
            msg = `Running: 'git pull ${safeUrl} ${this.pulledBranch}' (in directory ${localRepo.dir})`;
        }

        const pullUrl = this.authUrl || this.options.url;
        await this.runGit(`pull ${pullUrl} ${this.pulledBranch}`, localRepo.dir, msg);
    }

    async getCurrentBranch(repoDir: string): Promise<string> {
        return (await this.runGit('branch --show-current', repoDir)).trim();
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

    async listFiles(path: string, options?: FileListOptions): Promise<string[]> {
        const localRepo = this.options.localRepository;
        if (localRepo) {
            await this.pullBranch(localRepo);
            return await localRepo.fileSystem.listFiles(path, options);
        } else {
            // TODO: one request? paginated?
            const filePaths: string[] = [];
            try {
                const items = await this.doGet(`contents/${path}`);
                if (!Array.isArray(items)) {
                    throw new Error(`Expected 'array' instead of '${typeof items}': ${path}`);
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

    async getFileList(path: string, options?: FileListOptions): Promise<FileList> {
        const localRepo = this.options.localRepository;
        if (localRepo) {
            await this.pullBranch(localRepo);
            return await localRepo.fileSystem.getFileList(path, options);
        } else {
            const fileList: FileList = {};
            const filePaths = await this.listFiles(path, options);
            for (const filePath of filePaths) {
                const content = await this.getTextFileContent(filePath);
                if (content) {
                    fileList[filePath] = content;
                }
            }
            return fileList;
        }
    }

    async readTextFile(path: string): Promise<string | undefined> {
        const localRepo = this.options.localRepository;
        if (localRepo) {
            await this.pullBranch(localRepo);
            if (await localRepo.fileSystem.exists(path)) {
                return await localRepo.fileSystem.readTextFile(path);
            }
        } else {
            try {
                return await this.getTextFileContent(path);
            } catch (err: any) {
                if (err.status !== 404) throw err;
            }
        }
    }

    async getTextFileContent(path: string): Promise<string | undefined> {
        const localRepo = this.options.localRepository;
        if (localRepo) {
            await this.pullBranch(localRepo);
            const file = `${localRepo.dir}/${path}`;
            return await localRepo.fileSystem.readTextFile(file);
        } else {
            const file = await this.doGet(`contents/${path}`);
            if (typeof file !== 'object') {
                throw new Error(`Expected 'object' instead of '${typeof file}': ${path}`);
            }
            if (file.type !== 'file') {
                throw new Error(`Unexpected response type '${file.type}': ${path}`);
            }

            if (file.encoding === 'none') {
                this.options.logger.error(`Cannot download large file: ${path}`);
                return '';
            }

            return Buffer.from(file.content, file.encoding).toString();
        }
    }

    async runGit(cmd: string, cwd: string, msg?: string): Promise<string> {
        if (this.options.localRepository) {
            return await this.options.localRepository.executor.exec(`git ${cmd}`, {
                cwd,
                message: msg,
                logger: this.options.logger
            });
        } else {
            throw new Error('Cannot run git remotely');
        }
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
