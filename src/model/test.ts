import { Flow } from './flow';
import { PlyRequest, PlyResponse } from './request';
import { ActualResults, ExpectedResults, RunResult } from './result';

export interface Suite {
    /**
     * Path relative to plyBase
     */
    name: string;
    /**
     * Path relative to project
     */
    path: string;
    source?: string;
    expectedResults?: ExpectedResults;
    actualResults?: ActualResults;
}

export interface TestSuites {
    plyBase: string;
    requests: RequestSuite[];
    flows: Flow[];
}

export interface RequestSuite extends Suite {
    requests: PlyRequest[];
}

export interface Values {
    [path: string]: object;
}

export interface SuiteRun {
    suite: string;
    run: number;
    result: RunResult;
    start?: Date;
    end?: Date;
    testRuns: TestRun[];
}

export type TestType = 'request' | 'flow';

export interface TestRun {
    name: string;
    test: string;
    type: TestType;
    start?: Date;
    end?: Date;
    result: RunResult;
    request?: PlyRequest;
    response?: PlyResponse;
}
