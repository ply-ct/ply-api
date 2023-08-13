import { EvalOptions } from '@ply-ct/ply-values';
import { PlyOptions } from './options';
import { Logger } from './log';

export interface PlyDataOptions {
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
     * Values options
     */
    valuesOptions?: EvalOptions;
    /**
     * Logger
     */
    logger: Logger;
}
