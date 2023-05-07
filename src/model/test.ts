import { PlyRequest, PlyResponse } from './request';
import { RunResult } from './result';

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

export interface PlyTestSuites {
    plyBase: string;
    requests: PlyRequestSuite[];
    flows: PlyFlow[];
    cases: PlyCaseSuite[];
}

export interface PlyRequestSuite extends PlySuite {
    requests: PlyRequest[];
}

export interface PlyFlow extends PlySuite {
    steps: PlyStep[];
    subflows?: PlySubflow[];
}

export interface PlyStep {
    id: string;
    name: string;
    /**
     * Logical path for descriptor, or for custom steps
     * this is the module path to ts file.
     */
    path: string;
    attributes?: { [key: string]: string };
    type: 'step';
    links?: PlyLink[];
}

export interface PlyLink {
    id: string;
    to: string;
    attributes?: { [key: string]: string };
    type: 'link';
    event?: 'Finish' | 'Error' | 'Cancel' | 'Delay' | 'Resume';
    result?: string;
}

export interface PlySubflow {
    id: string;
    name: string;
    steps?: PlyStep[];
    attributes?: { [key: string]: string };
    type: 'subflow';
}

export interface PlyCaseSuite extends PlySuite {
    class: string;
    cases: PlyCase[];
}

export interface PlyCase {
    name: string;
    method: string;
}

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
    request?: PlyRequest;
    response?: PlyResponse;
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
