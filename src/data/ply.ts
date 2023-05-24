import { relative } from 'path';
import { PlyDefaults, PlyOptions } from '../model/options';
import { FileAccess, FileList } from '../model/files';
import { PlyRequest } from '../model/request';
import { RequestSuite, TestSuites } from '../model/test';
import { Flow, Step, Subflow } from '../model/flow';
import { ExpectedResults, ApiExpectedResult } from '../model/result';
import { loadContent } from '../util/content';
import { ApiLogger } from '../model/api';
import * as yaml from '../util/yaml';

export interface PlyDataOptions {
    /**
     * File system directory
     */
    dir?: string;
    /**
     * Git repository location
     */
    repoPath?: string;
    /**
     * Ply config location
     */
    plyConfig?: string;
    /**
     * Ply tests location
     */
    plyBase?: string;
    /**
     * Include suite source
     */
    suiteSource?: boolean;
    /**
     * Logger
     */
    logger?: ApiLogger;
}

// TODO: skipped
export class PlyData {
    readonly options: PlyDataOptions;

    constructor(readonly files: FileAccess, options?: PlyDataOptions) {
        this.options = options || {};
    }

    private plyOptions?: PlyOptions;
    async getPlyOptions(): Promise<PlyOptions> {
        if (!this.plyOptions) {
            this.plyOptions = new PlyDefaults();
            let plyConfigFile: string | undefined;
            let plyConfigContents: string | undefined;
            if (this.options.plyConfig) {
                plyConfigFile = this.options.plyConfig;
                plyConfigContents = await this.files.readTextFile(plyConfigFile);
            } else {
                plyConfigFile = 'plyconfig.yaml';
                plyConfigContents = await this.files.readTextFile(plyConfigFile);
                if (!plyConfigContents) {
                    plyConfigFile = 'plyconfig.json';
                    plyConfigContents = await this.files.readTextFile(plyConfigFile);
                }
            }
            if (plyConfigContents) {
                this.options.logger?.log(`Loading ply config from: ${plyConfigFile}`);
                const plyConfig = loadContent(plyConfigContents, plyConfigFile) as PlyOptions;
                this.plyOptions = { ...this.plyOptions, ...plyConfig };
            }
        }
        return this.plyOptions;
    }

    private plyBase?: string;
    async getPlyBase(): Promise<string> {
        if (this.plyBase === undefined) {
            if (this.options?.plyBase) {
                this.plyBase = this.options.plyBase;
            } else {
                const plyOptions = await this.getPlyOptions();
                this.plyBase = plyOptions.testsLocation || '.';
            }

            this.options.logger?.log(`Finding ply tests from ${this.plyBase}`);
        }
        return this.plyBase;
    }

    public async getPlySuites(): Promise<TestSuites> {
        // load serially to avoid overlapping github commands
        return {
            plyBase: await this.getPlyBase(),
            requests: await this.getPlyRequests(),
            flows: await this.getPlyFlows()
        };
    }

    public async getRequestSuite(path: string): Promise<RequestSuite | undefined> {
        const contents = await this.files.readTextFile(path);
        if (contents) {
            return await this.readRequestSuite(path, contents);
        }
    }

    private plyRequests?: RequestSuite[];
    public async getPlyRequests(): Promise<RequestSuite[]> {
        if (!this.plyRequests) {
            this.plyRequests = await this.loadPlyRequests();
        }
        return this.plyRequests;
    }

    /**
     * Lightweight request loader.
     */
    private async loadPlyRequests(): Promise<RequestSuite[]> {
        const requestSuites: RequestSuite[] = [];
        const requestFiles = await this.files.getFileList(await this.getPlyBase(), {
            recursive: true,
            patterns: ['**/*.ply.yaml', '**/*.ply.yml', '**/*.ply']
        });
        for (const path of Object.keys(requestFiles)) {
            try {
                requestSuites.push(await this.readRequestSuite(path, requestFiles[path]));
            } catch (err: unknown) {
                this.options.logger?.error(`${err}`, err);
            }
        }
        return requestSuites;
    }

    private async readRequestSuite(path: string, contents: string): Promise<RequestSuite> {
        const plyBase = await this.getPlyBase();
        const requestsObj = yaml.load(path, contents, true) as {
            [name: string]: PlyRequest;
        };
        if (!requestsObj) {
            throw new Error(`Bad ply request: ${plyBase}/${path}`);
        }
        const requests = Object.keys(requestsObj).map((name) => {
            return { ...requestsObj[name], name };
        });
        const requestSuite: RequestSuite = {
            name: relative(plyBase, path),
            path,
            requests
        };
        if (this.options.suiteSource) requestSuite.source = contents;
        return requestSuite;
    }

    async getPlyFlow(path: string): Promise<Flow | undefined> {
        const contents = await this.files.readTextFile(path);
        if (contents) {
            return await this.readPlyFlow(path, contents);
        }
    }

    private plyFlows?: Flow[];
    public async getPlyFlows(): Promise<Flow[]> {
        if (!this.plyFlows) {
            this.plyFlows = await this.loadPlyFlows();
        }
        return this.plyFlows;
    }
    /**
     * Lightweight flow loader.
     */
    private async loadPlyFlows(): Promise<Flow[]> {
        const plyFlows: Flow[] = [];
        const plyBase = await this.getPlyBase();
        const flowFiles = await this.files.getFileList(plyBase, {
            recursive: true,
            patterns: ['**/*.ply.flow']
        });
        for (const path of Object.keys(flowFiles)) {
            try {
                plyFlows.push(await this.readPlyFlow(path, flowFiles[path]));
            } catch (err: unknown) {
                this.options.logger?.error(`${err}`, err);
            }
        }
        return plyFlows;
    }

    private async readPlyFlow(path: string, contents: string): Promise<Flow> {
        const plyBase = await this.getPlyBase();
        const flow = yaml.load(path, contents) as Flow;
        if (!flow) {
            throw new Error(`Bad ply flow: ${plyBase}/${path}`);
        }
        flow.steps?.forEach((step) => (step.name = step.name.replace(/\r?\n/g, ' ')));
        const plyFlow: Flow = { name: relative(plyBase, path), path, steps: flow.steps || [] };
        if (flow.subflows) {
            const subflows: Subflow[] = flow.subflows;
            subflows.forEach((subflow) => {
                subflow.name = subflow.name.replace(/\r?\n/g, ' ');
                subflow.steps?.forEach((s) => (s.name = s.name.replace(/\r?\n/g, ' ')));
            });
            plyFlow.subflows = subflows;
        }
        this.sortSubflowsAndSteps(plyFlow);
        if (this.options.suiteSource) plyFlow.source = contents;
        return plyFlow;
    }

    private sortSubflowsAndSteps(flow: Flow) {
        flow.subflows?.sort((sub1, sub2) => {
            if (sub1.attributes?.when === 'Before' && sub2.attributes?.when !== 'Before') {
                return -1;
            } else if (sub2.attributes?.when === 'Before' && sub1.attributes?.when !== 'Before') {
                return 1;
            }
            if (sub1.attributes?.when === 'After' && sub2.attributes?.when !== 'After') {
                return 1;
            } else if (sub2.attributes?.when === 'After' && sub1.attributes?.when !== 'After') {
                return -1;
            }
            return sub1.id.localeCompare(sub2.id);
        });

        const addSteps = (flow: Flow | Subflow, start: Step, steps: Step[]) => {
            if (flow.steps && !steps.find((step) => step.id === start.id)) {
                steps.push(start);
                if (start.links) {
                    for (const link of start.links) {
                        const outStep = flow.steps.find((step) => step.id === link.to);
                        if (outStep) {
                            addSteps(flow, outStep, steps);
                        }
                    }
                }
            }
        };

        const flowStart = flow.steps.find((step) => step.path === 'start');
        if (flowStart) {
            const steps: Step[] = [];
            addSteps(flow, flowStart, steps);
            flow.steps = steps;
        }

        flow.subflows?.forEach((subflow) => {
            const subStart = subflow.steps?.find((step) => step.path === 'start');
            if (subStart) {
                const steps: Step[] = [];
                addSteps(subflow, subStart, steps);
                subflow.steps = steps;
            }
        });
    }

    public async getExpectedResults(path: string): Promise<ExpectedResults | undefined> {
        const contents = await this.files.readTextFile(path);
        if (contents) {
            return { path: path, contents };
        }
    }

    private apiExpectedResults?: ApiExpectedResult[];
    /**
     * Return expected results for requests and request steps
     */
    public async getApiExpectedResults(): Promise<ApiExpectedResult[]> {
        if (!this.apiExpectedResults) {
            this.apiExpectedResults = await this.loadApiExpectedResults();
        }
        return this.apiExpectedResults;
    }

    private async loadApiExpectedResults(): Promise<ApiExpectedResult[]> {
        const plyExpectedResults: ApiExpectedResult[] = [];
        const plyBase = await this.getPlyBase();
        if (plyBase) {
            const expectedPath = `${plyBase}/results/expected`;
            let resultFiles: FileList = {};
            try {
                resultFiles = await this.files.getFileList(expectedPath, {
                    patterns: ['**/*.yaml'],
                    recursive: true
                });
            } catch (err: unknown) {
                this.options.logger?.error(`API file access error: ${err}`);
                console.error(err);
            }
            for (const path of Object.keys(resultFiles)) {
                const expectedResults = this.readApiExpectedResults(path, resultFiles[path]);
                if (expectedResults) {
                    plyExpectedResults.push(...expectedResults);
                }
            }
        }
        return plyExpectedResults;
    }

    private readApiExpectedResults(
        path: string,
        contents: string
    ): ApiExpectedResult[] | undefined {
        // empty contents can happen for large, undownloadable files
        if (contents) {
            const expectedResults = yaml.load(path, contents) as {
                [name: string]: ApiExpectedResult;
            };
            if (expectedResults) {
                const results: ApiExpectedResult[] = [];
                for (const name of Object.keys(expectedResults)) {
                    const result = expectedResults[name];
                    if (result.request && result.response) {
                        result.path = path;
                        result.name = name;
                        results.push(result);
                    }
                }
                return results;
            }
        }
    }
}
