import { Logger } from './log';

export interface GitHubOptions {
    /**
     * GitHub web url
     * (eg: https://github.com/ply-ct/ply-demo)
     */
    url: string;
    /**
     * If not specified, use default branch
     */
    branch?: string;
    /**
     * Needed for non-public apis
     */
    token?: string;
    user?: string;
    reposDir?: string;
    verbose?: boolean;
    logger: Logger;
}

export interface Repository {
    url: string;
    owner: string;
    name: string;
    branch?: string;
    apiUrl: string;
    rawContentUrl: string;
    created?: Date;
    lastCommit?: Date;
}

export type DependabotState = 'OPEN' | 'FIXED' | 'DISMISSED';
export type DependabotSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type DependabotScope = 'DEVELOPMENT' | 'RUNTIME';

export interface DependabotAlert {
    id: string;
    number: number;
    url: string;
    severity: DependabotSeverity;
    state: DependabotState;
    summary: string;
    description: string;
    scope?: DependabotScope;
    dismissReason?: string;
    dismisser?: string;
    permalink?: string;
    target?: string;
    module?: string;
}
