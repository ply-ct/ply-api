import { Flow } from './flow';
import { PlyRequest } from './request';
import { ActualResults, ExpectedResults, ResultStatus } from './result';

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

/**
 * Can be either .ply.yaml, .ply.yml, or (with exactly one request) .ply
 */
export interface RequestSuite extends Suite {
    requests: PlyRequest[];
}

export interface PlyTest {
    /**
     * flow: stepId (subflows flattened), case/request: name
     */
    id: string;
    /**
     * request, step or case name
     */
    name: string;
    /**
     * flow steps only
     */
    path?: string;
    /**
     * request/case only
     */
    __start?: number;
    /**
     * request/case only
     */
    __end?: number;
    /**
     * populated by client?
     */
    status?: ResultStatus;
}

export type TestFileType = 'request' | 'request-suite' | 'flow' | 'case-suite';
// TODO: resultPaths?
export interface TestFile {
    /**
     * relative to plyBase
     */
    path: string;
    type: TestFileType;
    tests: PlyTest[];
    /**
     * populated by client?
     */
    status?: ResultStatus;
}

export interface TestFiles {
    ply: {
        base: string;
    };
    files: TestFile[];
    errors?: {
        file: string;
        message: string;
    }[];
}

export interface TestFolder {
    path: string;
    folders?: TestFolder[];
    files?: TestFile[];
}

export interface TestTree {
    ply: {
        base: string;
    };
    root: TestFolder;
    errors?: {
        file: string;
        message: string;
    }[];
}

export const plyExtensions = ['.ply', '.ply.yaml', '.ply.yml', '.ply.flow'];
export const isFilePath = (path: string): boolean => {
    for (const ext of plyExtensions) {
        if (path.endsWith(ext)) return true;
    }
    return false;
};

type TestItem = TestFile | TestFolder;
export const isFile = (fileOrFolder: TestItem): fileOrFolder is TestFile => {
    return (fileOrFolder as TestFile).tests !== undefined;
};
export const isFolder = (fileOrFolder: TestItem): fileOrFolder is TestFolder => {
    return !isFile(fileOrFolder);
};
