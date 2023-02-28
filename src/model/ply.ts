import * as flowbee from 'flowbee';
import { Status } from './api';

export interface PlyTests {
    requests: PlyRequestSuite[];
    flows: PlyFlow[];
    cases: PlyCaseSuite[];
}

export interface PlyRequestSuite {
    /**
     * Path relative to plyBase
     */
    name: string;
    /**
     * Path relative to project
     */
    path: string;
    requests: PlyRequest[];
}

export interface PlyRequest {
    name: string;
    url: string;
    method: string;
    headers: { [key: string]: string };
    body?: string;
}

export interface PlyFlow {
    /**
     * Path relative to plyBase
     */
    name: string;
    /**
     * Path relative to project
     */
    path: string;
    steps: PlyStep[];
}

export interface PlyStep {
    name: string;
    step: flowbee.Step;
    subflow?: flowbee.Subflow;
}

export interface PlyCaseSuite {
    /**
     * Path relative to plyBase
     */
    name: string;
    /**
     * Path relative to project
     */
    path: string;
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
