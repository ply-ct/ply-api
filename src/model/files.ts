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

/**
 * Handles relative-pathed file access for
 */
export interface FileAccess {
    exists(relPath: string): Promise<boolean>;
    /**
     * Returns matching file paths under dirPath. Empty if relPath does not exist.
     */
    listFiles(relPath: string, options?: FileListOptions): Promise<string[]>;

    /**
     * Maps file path to file contents. Empty object if relPath does not exist.
     */
    getFileList(relPath: string, options?: FileListOptions): Promise<FileList>;

    /**
     * Read file content, or undefined if file does not exist.
     */
    readTextFile(relPath: string): Promise<string | undefined>;
}
