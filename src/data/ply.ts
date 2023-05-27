import { PlyDataOptions } from '../model/data';
import { PlyOptions } from '../model/options';
import { FileAccess } from '../model/files';
import { RequestSuite, TestSuites } from '../model/test';
import { Flow } from '../model/flow';
import { ExpectedResults, ApiExpectedResult } from '../model/result';
import { OptionsLoader } from './ply-load/options';
import { RequestLoader } from './ply-load/requests';
import { FlowLoader } from './ply-load/flows';
import { ExpectedResultsLoader } from './ply-load/expected';

export class PlyAccess {
    readonly options: PlyDataOptions;
    private plyOptions?: PlyOptions;

    constructor(readonly files: FileAccess, options?: PlyDataOptions) {
        this.options = options || {};
        this.plyOptions = this.options.plyOptions;
    }

    /**
     *
     * @returns
     */
    async getPlyOptions(): Promise<PlyOptions> {
        if (!this.plyOptions) {
            const optionsLoader = new OptionsLoader(this.files, this.options);
            this.plyOptions = await optionsLoader.loadPlyOptions(this.options.plyConfig);
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
        const loader = new RequestLoader(this.files, this.options);
        return await loader.loadRequestSuite(await this.getPlyBase(), path);
    }

    private plyRequests?: RequestSuite[];
    public async getPlyRequests(): Promise<RequestSuite[]> {
        if (!this.plyRequests) {
            const loader = new RequestLoader(this.files, this.options);
            this.plyRequests = await loader.loadPlyRequests(await this.getPlyBase());
        }
        return this.plyRequests;
    }

    async getPlyFlow(path: string): Promise<Flow | undefined> {
        const loader = new FlowLoader(this.files, this.options);
        return await loader.loadPlyFlow(await this.getPlyBase(), path);
    }

    private plyFlows?: Flow[];
    public async getPlyFlows(): Promise<Flow[]> {
        if (!this.plyFlows) {
            const loader = new FlowLoader(this.files, this.options);
            this.plyFlows = await loader.loadPlyFlows(await this.getPlyBase());
        }
        return this.plyFlows;
    }

    public async getExpectedResults(path: string): Promise<ExpectedResults | undefined> {
        const contents = await this.files.readTextFile(path);
        if (contents) {
            return { path: path, contents };
        }
    }

    private apiExpectedResults?: ApiExpectedResult[];
    /**
     * Return expected results for requests and request steps only
     */
    public async getApiExpectedResults(): Promise<ApiExpectedResult[]> {
        if (!this.apiExpectedResults) {
            const loader = new ExpectedResultsLoader(this.files, this.options);
            this.apiExpectedResults = await loader.loadApiExpectedResults(await this.getPlyBase());
        }
        return this.apiExpectedResults;
    }
}
