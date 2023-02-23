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

export interface FileAccess {
    /**
     * Returns matching file paths under dirPath. Empty if dirPath does not exist.
     */
    listFiles(dirPath: string, options?: FileListOptions): Promise<string[]>;

    /**
     * Maps file path to file contents. Empty object if dirPath does not exist.
     */
    getFileList(dirPath: string, options?: FileListOptions): Promise<FileList>;

    /**
     * Read file content, or undefined if file does not exist.
     */
    readTextFile(filePath: string): Promise<string | undefined>;
}
