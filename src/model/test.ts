import { Flow } from './flow';
import { PlyRequest } from './request';
import { ActualResults, ExpectedResults } from './result';

export type TestType = 'request' | 'flow';

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
