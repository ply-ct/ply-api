import { ApiConfig } from '../model/api';
import { FileAccess } from '../model/files';
import { FileSystemAccess } from '../util/files';
import { GitHubAccess } from './github';

export class FileSystemData {
    constructor(readonly config: ApiConfig) {}

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
