import * as ply from '@ply-ct/ply';
import * as flowbee from 'flowbee';
import * as jsYaml from 'js-yaml';
import { ApiConfig } from '../model/api';
import { FileList } from '../model/files';
import {
    PlyRequestSuite,
    PlyExpectedResult,
    PlyRequest,
    PlyFlow,
    PlyStep,
    PlyCaseSuite
} from '../model/ply';
import { FileSystemData } from './files';
import { GitHubAccess } from './github';
import { fixPath } from '../util/files';
import { loadContent } from '../util/content';

export interface PlyDataOptions {
    plyBase?: string;
}

// TODO: skipped
export class PlyData {
    private files: FileSystemData;

    constructor(readonly config: ApiConfig, readonly options?: PlyDataOptions) {
        this.files = new FileSystemData(config);
    }

    private plyOptions?: ply.PlyOptions;
    async getPlyOptions(): Promise<ply.PlyOptions> {
        if (!this.plyOptions) {
            this.plyOptions = new ply.Defaults();
            const fileAccess = await this.files.getFileAccess();
            let plyConfigFile: string | undefined;
            let plyConfigContents: string | undefined;
            if (this.config.plyConfig) {
                plyConfigFile = this.config.dir
                    ? fixPath(this.config.plyConfig, this.config.dir)
                    : this.config.plyConfig;
                plyConfigContents = await fileAccess.readTextFile(plyConfigFile);
            } else {
                plyConfigFile = this.config.dir
                    ? fixPath('plyconfig.yaml', this.config.dir)
                    : 'plyconfig.yaml';
                plyConfigContents = await fileAccess.readTextFile(plyConfigFile);
                if (!plyConfigContents) {
                    plyConfigFile = this.config.dir
                        ? fixPath('plyconfig.json', this.config.dir)
                        : 'plyconfig.json';
                    plyConfigContents = await fileAccess.readTextFile(plyConfigFile);
                }
            }
            if (plyConfigContents) {
                this.config.logger?.log(`Loading ply config from: ${plyConfigFile}`);
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
                if (this.config.github.reposDir) {
                    const repoName = GitHubAccess.getRepositoryName(this.config.github.url);
                    this.plyBase = `${this.config.github.reposDir}/${repoName}/${this.plyBase}`;
                }
            } else {
                const plyOptions = await this.getPlyOptions();
                if (plyOptions) {
                    this.plyBase = plyOptions.testsLocation || '.';
                } else {
                    this.plyBase = '.';
                }
                if (this.config.dir) {
                    this.plyBase = fixPath(this.plyBase!, this.config.dir);
                } else if (this.config.github.reposDir) {
                    const repoName = GitHubAccess.getRepositoryName(this.config.github.url);
                    this.plyBase = `${this.config.github.reposDir}/${repoName}/${this.plyBase}`;
                }
            }

            this.config.logger?.log(`Finding ply tests from ${this.plyBase}`);
        }
        return this.plyBase!;
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
            const fileAccess = await this.files.getFileAccess();
            const requestFiles = await fileAccess.getFileList(plyBase, {
                recursive: true,
                patterns: ['**/*.ply.yaml', '**/*.ply']
            });
            for (const path of Object.keys(requestFiles)) {
                const contents = requestFiles[path];
                const requestsObj = jsYaml.load(contents, { filename: path }) as {
                    [name: string]: PlyRequest;
                };
                const requests = Object.keys(requestsObj).map((name) => {
                    return { ...requestsObj[name], name };
                });
                requestSuites.push({ path, requests });
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
            const fileAccess = await this.files.getFileAccess();
            const flowFiles = await fileAccess.getFileList(plyBase, {
                recursive: true,
                patterns: ['**/*.ply.flow']
            });
            for (const path of Object.keys(flowFiles)) {
                const contents = flowFiles[path];
                const flow = jsYaml.load(contents, { filename: path }) as flowbee.Flow;
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
                flows.push({ path, steps } as any);
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
            const fileAccess = await this.files.getFileAccess();
            const caseFiles = await fileAccess.listFiles(plyBase, {
                recursive: true,
                patterns: ['**/*.ply.ts']
            });
            if (!caseFiles) return [];

            if (!this.config.dir && !this.config.github.reposDir) {
                throw new Error('Loading ply cases requires local source code');
            }

            const options = await this.getPlyOptions();
            const loadedSuites = await new ply.Ply(options).loadCases(caseFiles);
            for (const loadedSuite of loadedSuites) {
                const caseSuite: PlyCaseSuite = {
                    path: caseFiles.find((cf) => loadedSuite.path.endsWith(cf)) || loadedSuite.path, // why?
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
            const fileAccess = await this.files.getFileAccess();
            const expectedPath = `${plyBase}/results/expected`;
            let resultFiles: FileList = {};
            try {
                resultFiles = await fileAccess.getFileList(expectedPath, {
                    patterns: ['**/*.yaml'],
                    recursive: true
                });
            } catch (err: unknown) {
                this.config.logger?.error(`API file access error: ${err}`);
                console.error(err);
            }
            for (const path of Object.keys(resultFiles)) {
                const contents = resultFiles[path];
                // empty contents can happen for large, undownloadable files
                if (contents) {
                    const expectedResults = jsYaml.load(contents, { filename: path }) as {
                        [name: string]: PlyExpectedResult;
                    };
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
        return plyExpectedResults;
    }
}
