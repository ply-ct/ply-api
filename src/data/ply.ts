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
    PlyTests
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
        const plyBase = await this.getPlyBase();
        if (plyBase) {
            const requestFiles = await this.files.getFileList(plyBase, {
                recursive: true,
                patterns: ['**/*.ply.yaml', '**/*.ply']
            });
            for (const path of Object.keys(requestFiles)) {
                const contents = requestFiles[path];
                const requestsObj = jsYaml.load(contents, { filename: path }) as {
                    [name: string]: PlyRequest;
                };
                if (requestsObj) {
                    const requests = Object.keys(requestsObj).map((name) => {
                        return { ...requestsObj[name], name };
                    });
                    requestSuites.push({ name: relative(plyBase, path), path, requests });
                }
            }
        }
        return requestSuites;
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
        const flows: PlyFlow[] = [];
        const plyBase = await this.getPlyBase();
        if (plyBase) {
            const flowFiles = await this.files.getFileList(plyBase, {
                recursive: true,
                patterns: ['**/*.ply.flow']
            });
            for (const path of Object.keys(flowFiles)) {
                const contents = flowFiles[path];
                const flow = jsYaml.load(contents, { filename: path }) as flowbee.Flow;
                if (flow) {
                    const steps: PlyStep[] = [];
                    if (flow.steps) {
                        for (const step of flow.steps) {
                            steps.push({ name: step.name.replace(/\r?\n/g, ' '), step });
                        }
                    }
                    if (flow.subflows) {
                        for (const subflow of flow.subflows) {
                            if (subflow.steps) {
                                for (const step of subflow.steps) {
                                    steps.push({
                                        name: step.name.replace(/\r?\n/g, ' '),
                                        step,
                                        subflow
                                    });
                                }
                            }
                        }
                    }
                    flows.push({ name: relative(plyBase, path), path, steps });
                }
            }
        }
        return flows;
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
        if (plyBase) {
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
                const path =
                    caseFiles.find((cf) => loadedSuite.path.endsWith(cf)) || loadedSuite.path; // why?
                const caseSuite: PlyCaseSuite = {
                    name: relative(plyBase, path),
                    path,
                    class: loadedSuite.className!,
                    cases: []
                };
                caseSuites.push(caseSuite);
                for (const loadedCase of loadedSuite.all()) {
                    caseSuite.cases.push({
                        name: loadedCase.name,
                        method: loadedCase.method
                    });
                }
            }
        }
        return caseSuites;
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
