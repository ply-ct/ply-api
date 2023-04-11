import { relative } from 'path';
import * as ply from '@ply-ct/ply';
import * as flowbee from 'flowbee';
import * as jsYaml from 'js-yaml';
import { FileAccess, FileList } from '../model/files';
import {
    PlyRequestSuite,
    PlyExpectedResult,
    PlyRequest,
    PlyFlow,
    PlyStep,
    PlyCaseSuite,
    PlyTests,
    PlySubflow
} from '../model/ply';
import { loadContent } from '../util/content';
import { ApiLogger } from '../model/api';

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

    private plyOptions?: ply.PlyOptions;
    async getPlyOptions(): Promise<ply.PlyOptions> {
        if (!this.plyOptions) {
            this.plyOptions = new ply.Defaults();
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
                const plyConfig = loadContent(plyConfigContents, plyConfigFile) as ply.Options;
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

    public async getPlyTests(): Promise<PlyTests> {
        // load serially to avoid overlapping github commands
        return {
            requests: await this.getPlyRequests(),
            flows: await this.getPlyFlows(),
            cases: await this.getPlyCases()
        };
    }

    public async getRequestSuite(path: string): Promise<PlyRequestSuite | undefined> {
        const contents = await this.files.readTextFile(path);
        if (contents) {
            return await this.readRequestSuite(path, contents);
        }
    }

    private plyRequests?: PlyRequestSuite[];
    public async getPlyRequests(): Promise<PlyRequestSuite[]> {
        if (!this.plyRequests) {
            this.plyRequests = await this.loadPlyRequests();
        }
        return this.plyRequests;
    }

    /**
     * Lightweight request loader.
     */
    private async loadPlyRequests(): Promise<PlyRequestSuite[]> {
        const requestSuites: PlyRequestSuite[] = [];
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

    private async readRequestSuite(path: string, contents: string): Promise<PlyRequestSuite> {
        const plyBase = await this.getPlyBase();
        const requestsObj = jsYaml.load(contents, { filename: path }) as {
            [name: string]: PlyRequest;
        };
        if (!requestsObj) {
            throw new Error(`Bad ply request: ${plyBase}/${path}`);
        }
        const requests = Object.keys(requestsObj).map((name) => {
            return { ...requestsObj[name], name };
        });
        const requestSuite: PlyRequestSuite = { name: relative(plyBase, path), path, requests };
        if (this.options.suiteSource) requestSuite.source = contents;
        return requestSuite;
    }

    async getPlyFlow(path: string): Promise<PlyFlow | undefined> {
        const contents = await this.files.readTextFile(path);
        if (contents) {
            return await this.readPlyFlow(path, contents);
        }
    }

    private plyFlows?: PlyFlow[];
    public async getPlyFlows(): Promise<PlyFlow[]> {
        if (!this.plyFlows) {
            this.plyFlows = await this.loadPlyFlows();
        }
        return this.plyFlows;
    }
    /**
     * Lightweight flow loader.
     */
    private async loadPlyFlows(): Promise<PlyFlow[]> {
        const plyFlows: PlyFlow[] = [];
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

    private async readPlyFlow(path: string, contents: string): Promise<PlyFlow> {
        const plyBase = await this.getPlyBase();
        const flow = jsYaml.load(contents, { filename: path }) as flowbee.Flow;
        if (!flow) {
            throw new Error(`Bad ply flow: ${plyBase}/${path}`);
        }
        flow.steps?.forEach((step) => (step.name = step.name.replace(/\r?\n/g, ' ')));
        const plyFlow: PlyFlow = { name: relative(plyBase, path), path, steps: flow.steps || [] };
        if (flow.subflows) {
            const subflows: PlySubflow[] = flow.subflows;
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

    private sortSubflowsAndSteps(flow: PlyFlow) {
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

        const addSteps = (flow: PlyFlow | PlySubflow, start: flowbee.Step, steps: PlyStep[]) => {
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
            const steps: PlyStep[] = [];
            addSteps(flow, flowStart, steps);
            flow.steps = steps;
        }

        flow.subflows?.forEach((subflow) => {
            const subStart = subflow.steps?.find((step) => step.path === 'start');
            if (subStart) {
                const steps: PlyStep[] = [];
                addSteps(subflow, subStart, steps);
                subflow.steps = steps;
            }
        });
    }

    async getCaseSuite(path: string): Promise<PlyCaseSuite | undefined> {
        const contents = await this.files.readTextFile(path);
        if (contents) {
            const baseDir = this.options.dir || this.options.repoPath;
            if (!baseDir) {
                throw new Error('Loading ply cases requires local source code');
            }

            const options = await this.getPlyOptions();
            const loadedSuites = await new ply.Ply(options).loadCases(`${baseDir}/${path}`);
            if (!loadedSuites || loadedSuites.length === 0) {
                throw new Error(`Bad ply case: ${baseDir}/${path}`);
            }

            return await this.loadCaseSuite(
                loadedSuites[0].path.endsWith(path) ? path : loadedSuites[0].path, // why?
                loadedSuites[0]
            );
        }
    }

    private plyCases?: PlyCaseSuite[];
    public async getPlyCases(): Promise<PlyCaseSuite[]> {
        if (!this.plyCases) {
            this.plyCases = await this.loadPlyCases();
        }
        return this.plyCases;
    }
    /**
     * Use ply api for cases for descriptor parsing.
     */
    private async loadPlyCases(): Promise<PlyCaseSuite[]> {
        const caseSuites: PlyCaseSuite[] = [];
        const plyBase = await this.getPlyBase();
        const caseFiles = await this.files.listFiles(plyBase, {
            recursive: true,
            patterns: ['**/*.ply.ts']
        });
        if (!caseFiles) return [];

        const baseDir = this.options.dir || this.options.repoPath;
        if (!baseDir) {
            throw new Error('Loading ply cases requires local source code');
        }

        const options = await this.getPlyOptions();
        const loadedSuites = await new ply.Ply(options).loadCases(
            caseFiles.map((cf) => `${baseDir}/${cf}`)
        );
        for (const loadedSuite of loadedSuites) {
            const path = caseFiles.find((cf) => loadedSuite.path.endsWith(cf)) || loadedSuite.path; // why?
            caseSuites.push(await this.loadCaseSuite(path, loadedSuite));
        }
        return caseSuites;
    }

    private async loadCaseSuite(
        path: string,
        loadedSuite: ply.Suite<ply.Case>
    ): Promise<PlyCaseSuite> {
        const plyBase = await this.getPlyBase();
        const caseSuite: PlyCaseSuite = {
            name: relative(plyBase, path),
            path,
            class: loadedSuite.className!,
            cases: []
        };
        for (const loadedCase of loadedSuite.all()) {
            caseSuite.cases.push({
                name: loadedCase.name,
                method: loadedCase.method
            });
        }
        if (this.options.suiteSource) {
            caseSuite.source = await this.files.readTextFile(path);
        }
        return caseSuite;
    }

    private expectedResults?: PlyExpectedResult[];
    public async getExpectedResults(): Promise<PlyExpectedResult[]> {
        if (!this.expectedResults) {
            this.expectedResults = await this.loadExpectedResults();
        }
        return this.expectedResults;
    }

    private async loadExpectedResults(): Promise<PlyExpectedResult[]> {
        const plyExpectedResults: PlyExpectedResult[] = [];
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
                const contents = resultFiles[path];
                // empty contents can happen for large, undownloadable files
                if (contents) {
                    const expectedResults = jsYaml.load(contents, { filename: path }) as {
                        [name: string]: PlyExpectedResult;
                    };
                    if (expectedResults) {
                        for (const name of Object.keys(expectedResults)) {
                            const result = expectedResults[name];
                            if (result.request && result.response) {
                                result.file = path;
                                result.name = name;
                                plyExpectedResults.push(result);
                            }
                        }
                    }
                }
            }
        }
        return plyExpectedResults;
    }
}
