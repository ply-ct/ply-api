import { promises as fs, existsSync, Stats } from 'fs';
import { normalize, isAbsolute } from 'path';
import { minimatch } from 'minimatch';
import { FileAccess, FileListOptions, FileList, DirOptions } from '../model/files';

export class FileSystemAccess implements FileAccess {
    readonly base: string;
    constructor(base: string) {
        this.base = base.replace(/\\/g, '/');
        if (this.base.endsWith('/')) {
            this.base = this.base.substring(0, this.base.length - 1);
        }
    }

    async exists(path: string): Promise<boolean> {
        // path is absolute for values files
        const fsPath = this.getPath(path);
        return existsSync(fsPath);
    }

    async createDir(path: string, options?: DirOptions | undefined) {
        const dirPath = this.getPath(path);
        await fs.mkdir(dirPath, options);
    }

    async deleteDir(path: string, options?: DirOptions | undefined) {
        const dirPath = this.getPath(path);
        await fs.rm(dirPath, options);
    }

    async listFiles(path: string, options?: FileListOptions | undefined): Promise<string[]> {
        const dirPath = this.getPath(path);
        const filePaths: string[] = [];
        if (existsSync(dirPath)) {
            let items: string[];
            try {
                items = await fs.readdir(dirPath);
            } catch (err: any) {
                throw new Error(`Error reading dir: 'dirPath': ${err.message}`);
            }
            for (const item of items) {
                const filePath = `${path}/${item}`;
                let stats: Stats;
                try {
                    stats = await fs.stat(`${this.base}/${filePath}`);
                } catch (err: any) {
                    throw new Error(`Error getting file stats for '${filePath}': ${err.message}`);
                }
                if (stats.isFile()) {
                    if (!options?.patterns || this.isMatch(filePath, options.patterns)) {
                        filePaths.push(filePath);
                    }
                } else if (stats.isDirectory() && options?.recursive) {
                    filePaths.push(...(await this.listFiles(filePath, options)));
                }
            }
        }
        return filePaths;
    }

    async getFileList(path: string, options?: FileListOptions | undefined): Promise<FileList> {
        const fileList: FileList = {};
        const filePaths = await this.listFiles(path, options);
        for (const filePath of filePaths) {
            fileList[filePath] = await this.readFile(`${this.base}/${filePath}`);
        }
        return fileList;
    }

    async readTextFile(path: string): Promise<string | undefined> {
        // path is absolute for values files
        const filePath = isAbsolute(path) ? path : `${this.base}/${path}`;
        if (existsSync(filePath)) {
            return await fs.readFile(filePath, { encoding: 'utf-8' });
        }
    }

    /**
     * Match against glob patterns
     */
    private isMatch(path: string, patterns: string[]): boolean {
        for (const pattern of patterns) {
            if (minimatch(normalize(path), pattern, { dot: true })) {
                return true;
            }
        }
        return false;
    }

    /**
     * Catches errors to provide a meaningful stack
     */
    private async readFile(file: string): Promise<string> {
        try {
            return await fs.readFile(file, { encoding: 'utf-8' });
        } catch (err: any) {
            throw new Error(`Error reading file '${file}': ${err.message}`);
        }
    }

    private getPath(path: string): string {
        return isAbsolute(path) ? path : path === '.' ? this.base : `${this.base}/${path}`;
    }
}
