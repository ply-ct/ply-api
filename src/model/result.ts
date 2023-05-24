import { PlyRequest, PlyResponse } from './request';

export interface ExpectedResults {
    path: string;
    contents: string;
}

export interface ActualResults {
    path: string;
    contents: string;
}

export interface ApiExpectedResult {
    path: string;
    name: string;
    request: PlyRequest;
    response: PlyResponse;
}

export interface ApiExpectedResults {
    [name: string]: ApiExpectedResult;
}

export type ResultStatus = 'Pending' | 'Running' | 'Passed' | 'Failed' | 'Errored' | 'Submitted';

export interface Outcome {
    /**
     * Status of test execution
     */
    status: ResultStatus;
    message: string;
    /**
     * One-based line number of first diff, relative to starting line of test
     */
    line?: number;
    /**
     * Diff message
     */
    diff?: string;
    diffs?: Diff[];

    start?: number;
    end?: number;
}

/**
 * jsdiff object
 */
export interface Diff {
    added?: boolean;
    removed?: boolean;
    ignored?: boolean;
    value: string;
    count: number;
}

export interface RunResult {
    status: ResultStatus;
    message?: string;
}
