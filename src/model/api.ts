import { StatusCodes } from 'http-status-codes';
import { GitHubConfig } from '../data/github';

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

export interface Status {
    code: StatusCodes;
    message: string;
}

/**
 * HTTP non-success status error
 */
export class StatusError extends Error {
    readonly status: Status;

    constructor(status: Status);
    constructor(code: StatusCodes, message: string);
    constructor(statusOrCode: Status | StatusCodes, message?: string) {
        super(typeof statusOrCode === 'number' ? '' + message : statusOrCode.message);
        if (typeof statusOrCode === 'number') {
            this.status = { code: statusOrCode, message: '' + message };
        } else {
            this.status = statusOrCode;
        }
    }
}
