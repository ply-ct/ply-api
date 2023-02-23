import { promises as fs, existsSync, Stats } from 'fs';
import * as path from 'path';
import { isMatch } from './match';
import { FileListOptions, FileList, FileAccess } from '../model/files';
import { readFile } from './content';

export class FileSystemAccess implements FileAccess {
    async listFiles(dirPath: string, options?: FileListOptions | undefined): Promise<string[]> {
        const filePaths: string[] = [];
        if (existsSync(dirPath)) {
            let items: string[];
            try {
                items = await fs.readdir(dirPath);
            } catch (err: any) {
                throw new Error(`Error reading dir: 'dirPath': ${err.message}`);
            }
            for (const item of items) {
                const path = `${dirPath}/${item}`;
                let stats: Stats;
                try {
                    stats = await fs.stat(path);
                } catch (err: any) {
                    throw new Error(`Error getting file stats for '${path}': ${err.message}`);
                }
                if (stats.isFile()) {
                    if (!options?.patterns || isMatch(path, options.patterns)) {
                        filePaths.push(path);
                    }
                } else if (stats.isDirectory() && options?.recursive) {
                    filePaths.push(...(await this.listFiles(path, options)));
                }
            }
        }
        return filePaths;
    }

    async getFileList(dirPath: string, options?: FileListOptions | undefined): Promise<FileList> {
        const fileList: FileList = {};
        const filePaths = await this.listFiles(dirPath, options);
        for (const filePath of filePaths) {
            fileList[filePath] = await readFile(filePath);
        }
        return fileList;
    }

    async readTextFile(filePath: string): Promise<string | undefined> {
        if (existsSync(filePath)) {
            return await fs.readFile(filePath, { encoding: 'utf-8' });
        }
    }
}

/**
 * Forward slashes, no trailing slash, absolute, normalized.
 * If fileOrDir is not absolute, it's prefixed by rootDir if any.
 */
export const fixPath = (fileOrDir: string, rootDir?: string): string => {
    let fixed = path.normalize(fileOrDir.replace(/\\/g, '/'));
    if (fixed.endsWith('/')) fixed = fixed.substring(0, fixed.length - 1);
    if (!path.isAbsolute(fixed) && rootDir) fixed = `${rootDir}/${fixed}`;
    return path.resolve(fixed);
};
