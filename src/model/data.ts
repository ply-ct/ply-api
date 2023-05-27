import { PlyOptions } from './options';
import { Logger } from './log';

export interface PlyDataOptions {
    /**
     * File system directory
     */
    dir?: string;
    /**
     * Git repository location
     */
    repoPath?: string;
    /**
     * Ply config location
     */
    plyConfig?: string;
    /**
     * Pre-populated Ply options
     */
    plyOptions?: PlyOptions;
    /**
     * Ply tests location
     */
    plyBase?: string;
    /**
     * Include suite source
     */
    suiteSource?: boolean;
    /**
     * Include expected results
     */
    expectedResults?: boolean;
    /**
     * Include actual results
     */
    actualResults?: boolean;
    /**
     * Logger
     */
    logger?: Logger;
}
