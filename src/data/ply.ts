import { ValuesHolder, EvalOptions } from '@ply-ct/ply-values';
import { PlyDataOptions } from '../model/data';
import { PlyOptions } from '../model/options';
import { FileAccess } from '../model/files';
import { Logger } from '../model/log';
import { RequestSuite, TestSuites } from '../model/test';
import { Flow } from '../model/flow';
import { ExpectedResults, ApiExpectedResult, ActualResults } from '../model/result';
import { OptionsLoader } from './ply-load/options';
import { RequestLoader } from './ply-load/requests';
import { FlowLoader } from './ply-load/flows';
import { ExpectedResultsLoader } from './ply-load/expected';
import { ValuesLoader } from './ply-load/values';
import {
    Descriptor,
    DescriptorLoadOptions,
    customDescriptorDefaults,
    standardDescriptorDefaults
} from '../model/descriptor';
import { DescriptorsLoader } from './ply-load/descriptors';

export class PlyAccess {
    readonly options: PlyDataOptions;
    private plyOptions?: PlyOptions;
    private plyBase?: string;

    constructor(readonly files: FileAccess, options?: PlyDataOptions) {
        this.options = options || { logger: console };
        this.plyOptions = this.options.plyOptions;
        this.plyBase = this.options.plyBase;
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

    /**
     * @param relPath must be relative
     */
    public async getRequestSuite(relPath: string): Promise<RequestSuite | undefined> {
        const loader = new RequestLoader(this.files, this.options);
        return await loader.loadRequestSuite(await this.getPlyBase(), relPath);
    }

    private plyRequests?: RequestSuite[];
    public async getPlyRequests(): Promise<RequestSuite[]> {
        if (!this.plyRequests) {
            const loader = new RequestLoader(this.files, this.options);
            this.plyRequests = await loader.loadPlyRequests(await this.getPlyBase());
        }
        return this.plyRequests;
    }

    /**
     * @param relPath must be relative
     */
    async getPlyFlow(relPath: string): Promise<Flow | undefined> {
        const loader = new FlowLoader(this.files, this.options);
        return await loader.loadPlyFlow(await this.getPlyBase(), relPath);
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
        if (contents !== undefined) {
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

    private get valuesOptions(): EvalOptions & { logger: Logger } {
        return { ...this.options.valuesOptions, logger: this.options.logger };
    }

    private fileValuesHolders?: ValuesHolder[];
    public async getFileValuesHolders(): Promise<ValuesHolder[]> {
        if (!this.fileValuesHolders) {
            const loader = new ValuesLoader(this.files, this.valuesOptions);
            const valuesFiles = (await this.getPlyOptions()).valuesFiles || {};
            if (Array.isArray(valuesFiles)) {
                this.fileValuesHolders = await loader.loadFileValues(valuesFiles);
            } else {
                const enabledValuesFiles = Object.keys(valuesFiles).filter((vf) => valuesFiles[vf]);
                this.fileValuesHolders = await loader.loadFileValues(enabledValuesFiles);
            }
        }
        return this.fileValuesHolders;
    }

    public getRequestRefValues(actualResults: ActualResults): ValuesHolder {
        const loader = new ValuesLoader(this.files, this.valuesOptions);
        return loader.readRequestRefValues(actualResults);
    }

    public getFlowRefValues(actualResults: ActualResults): ValuesHolder {
        const loader = new ValuesLoader(this.files, this.valuesOptions);
        return loader.readFlowRefValues(actualResults);
    }

    public getFlowValues(flow: Flow, evalContext?: object): ValuesHolder {
        const loader = new ValuesLoader(this.files, this.valuesOptions);
        return loader.readFlowValues(flow, evalContext);
    }

    private standardDescriptors?: Descriptor[];
    public async getStandardDescriptors(
        options: DescriptorLoadOptions = {}
    ): Promise<Descriptor[]> {
        if (!this.standardDescriptors) {
            let opts = { ...standardDescriptorDefaults, ...options };
            if (!opts.logger) {
                opts = { ...opts, logger: this.options.logger };
            }
            const loader = new DescriptorsLoader(this.files, opts);
            this.standardDescriptors = await loader.loadStandardDescriptors();
        }
        return this.standardDescriptors;
    }

    private customDescriptors?: Descriptor[];
    public async getCustomDescriptors(options: DescriptorLoadOptions = {}): Promise<Descriptor[]> {
        if (!this.customDescriptors) {
            let opts = { ...customDescriptorDefaults, ...options };
            if (!opts.logger) {
                opts = { ...opts, logger: this.options.logger };
            }
            const loader = new DescriptorsLoader(this.files, opts);
            this.customDescriptors = await loader.loadCustomDescriptors();
        }
        return this.customDescriptors;
    }
}
