import * as flowbee from 'flowbee';
import { Status } from './api';

export interface PlySuite {
    /**
     * Path relative to plyBase
     */
    name: string;
    /**
     * Path relative to project
     */
    path: string;
    source?: string;
}

export interface PlyTests {
    requests: PlyRequestSuite[];
    flows: PlyFlow[];
    cases: PlyCaseSuite[];
}

export interface PlyRequestSuite extends PlySuite {
    requests: PlyRequest[];
}

export interface PlyRequest {
    name: string;
    url: string;
    method: string;
    headers: { [key: string]: string };
    body?: string;
}

export interface PlyFlow extends PlySuite {
    steps: PlyStep[];
    subflows?: PlySubflow[];
}

export interface PlyStep extends flowbee.Step {}

export interface PlySubflow extends flowbee.Subflow {
    steps?: PlyStep[];
}

export interface PlyCaseSuite extends PlySuite {
    class: string;
    cases: PlyCase[];
}

export interface PlyCase {
    name: string;
    method: string;
}

export interface RunResult {
    status: ResultStatus;
    message?: string;
}

export type ResultStatus = 'Pending' | 'Passed' | 'Failed' | 'Errored' | 'Submitted';

export interface SuiteRun {
    suite: string;
    run: number;
    result: RunResult;
    start?: Date;
    end?: Date;
    testRuns: TestRun[];
}

export type TestType = 'request' | 'flow' | 'case';

export interface TestRun {
    name: string;
    test: string;
    type: TestType;
    start?: Date;
    end?: Date;
    result: RunResult;
    request?: Request;
    response?: Response;
}

export interface PlyResponse {
    status: Status;
    headers: { [key: string]: string };
    body?: any;
}

export interface PlyExpectedResult {
    file: string;
    name: string;
    request: PlyRequest;
    response: PlyResponse;
}

export const isPlyPath = (path: string): boolean => {
    return path.endsWith('.ply');
};
export const isRequestPath = (path: string): boolean => {
    return path.endsWith('.yaml') || path.endsWith('.yml') || isPlyPath(path);
};
export const isRequestSuite = (suite: PlySuite): suite is PlyRequestSuite => {
    return isRequestPath(suite.path);
};

export const isFlowPath = (path: string): boolean => {
    return path.endsWith('.flow');
};
export const isFlow = (suite: PlySuite): suite is PlyFlow => {
    return isFlowPath(suite.path);
};

export const isCasePath = (path: string): boolean => {
    return path.endsWith('.ts');
};
export const isCaseSuite = (suite: PlySuite): suite is PlyCaseSuite => {
    return isCasePath(suite.path);
};
