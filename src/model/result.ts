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
    name?: string;
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

    data?: any;
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

export interface OverallResults {
    Passed: number;
    Failed: number;
    Errored: number;
    Pending: number;
    Submitted: number;
}

export interface PlyResults {
    overall: OverallResults;
    runs: SuiteRun[];
}

export interface SuiteRun {
    suite: string;
    run: number;
    result: RunResult;
    start?: Date;
    end?: Date;
    testRuns: TestRun[];
}

export interface TestRun {
    name: string;
    test: string;
    type: 'request' | 'flow';
    start?: Date;
    end?: Date;
    result: RunResult;
    request?: PlyRequest;
    response?: PlyResponse;
}
