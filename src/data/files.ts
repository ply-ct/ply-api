import { FileAccess } from '../model/files';
import { GitHubConfig } from '../model/github';
import { FileSystemAccess } from '../util/files';
import { GitHubAccess } from './github';

export class FilesAccess {
    constructor(readonly config: { dir?: string; github: GitHubConfig }) {}

    private fileAccess?: FileAccess;
    async getFileAccess(): Promise<FileAccess> {
        if (!this.fileAccess) {
            if (this.config.dir) {
                this.fileAccess = new FileSystemAccess(this.config.dir);
            } else {
                const githubAccess = new GitHubAccess(this.config.github);
                await githubAccess.init();
                this.fileAccess = githubAccess;
            }
        }
        return this.fileAccess;
    }
}
