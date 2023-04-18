import { StatusCodes } from 'http-status-codes';

export interface PlyRequest {
    name: string;
    url: string;
    method: string;
    headers: { [key: string]: string };
    body?: string;
}

export interface Status {
    code: StatusCodes;
    message: string;
}

export interface PlyResponse {
    status: Status;
    headers: { [key: string]: string };
    body?: any;
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
