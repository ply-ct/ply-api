import { GitHubConfig } from './github';

export interface ApiLogger {
    log(message?: any, ...optionalParams: any[]): void;
    error(message?: any, ...optionalParams: any[]): void;
}

export interface ApiConfig {
    name: string;
    dir?: string;
    github: GitHubConfig;
    logger?: ApiLogger;
    plyConfig?: string; // path to ply config file
}
