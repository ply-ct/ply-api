import { normalize } from 'path';
import { minimatch } from 'minimatch';

/**
 * Match against glob patterns
 */
export const isMatch = (path: string, patterns: string[]): boolean => {
    for (const pattern of patterns) {
        if (minimatch(normalize(path), pattern, { dot: true })) {
            return true;
        }
    }
    return false;
};
