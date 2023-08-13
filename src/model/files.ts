import { GitHubOptions } from './github';

export interface FileAccessOptions {
    dir?: string;
    githubOptions?: GitHubOptions;
}

export interface FileListOptions {
    recursive?: boolean;
    /**
     * match glob patterns
     */
    patterns?: string[];
}

/**
 * File path to contents
 */
export interface FileList {
    [path: string]: string;
}

export interface DirOptions {
    recursive?: boolean;
}

/**
 * Handles relative-pathed file access for
 */
export interface FileAccess {
    exists(path: string): Promise<boolean>;
    /**
     * Returns matching file paths under dirPath. Empty if path does not exist.
     */
    listFiles(path: string, options?: FileListOptions): Promise<string[]>;

    /**
     * Maps file path to file contents. Empty object if path does not exist.
     */
    getFileList(path: string, options?: FileListOptions): Promise<FileList>;

    /**
     * Read file content, or undefined if file does not exist.
     */
    readTextFile(path: string): Promise<string | undefined>;

    createDir(path: string, options?: DirOptions): Promise<void>;

    deleteDir(path: string, options?: DirOptions): Promise<void>;
}
