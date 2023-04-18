export type ResultStatus = 'Pending' | 'Passed' | 'Failed' | 'Errored' | 'Submitted';

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
