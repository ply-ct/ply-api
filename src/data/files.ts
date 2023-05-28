import { FileAccess, FileAccessOptions } from '../model/files';
import { FileSystemAccess } from '../util/files';
import { GitHubAccess } from './github';

export class FilesAccess {
    constructor(readonly options: FileAccessOptions) {}

    private fileAccess?: FileAccess;
    async getFileAccess(): Promise<FileAccess> {
        if (!this.fileAccess) {
            if (this.options.dir) {
                this.fileAccess = new FileSystemAccess(this.options.dir);
            } else if (this.options.githubOptions) {
                const githubAccess = new GitHubAccess(this.options.githubOptions);
                await githubAccess.init();
                this.fileAccess = githubAccess;
            } else {
                throw new Error(`Options must include 'dir' or 'github'`);
            }
        }
        return this.fileAccess;
    }
}
