export interface PlyOptions {
    /**
     * Tests base directory ('.').
     */
    testsLocation?: string;
    /**
     * Request files glob pattern, relative to testsLocation ('**\/*.{ply.yaml,ply.yml}').
     */
    requestFiles?: string;
    /**
     * Case files glob pattern, relative to testsLocation ('**\/*.ply.ts').
     */
    caseFiles?: string;
    /**
     * Flow files glob pattern, relative to testsLocation ('**\/*.ply.flow').
     */
    flowFiles?: string;
    /**
     * File pattern to ignore, relative to testsLocation ('**\/{node_modules,bin,dist,out}\/**').
     */
    ignore?: string;
    /**
     * File pattern for requests/cases/flows that shouldn't be directly executed, relative to testsLocation.
     */
    skip?: string;
    /**
     * Expected results base dir (testsLocation + '/results/expected').
     */
    expectedLocation?: string;
    /**
     * Actual results base dir (this.testsLocation + '/results/actual').
     */
    actualLocation?: string;
    /**
     * Result files live under a similar subpath as request/case files (true).
     * (eg: Expected result relative to 'expectedLocation' is the same as
     * request file relative to 'testsLocation').
     */
    resultFollowsRelativePath?: boolean;
    /**
     * Log file base dir (this.actualLocation).
     */
    logLocation?: string;
    /**
     * Files containing values JSON (or CSV or XLSX).
     */
    valuesFiles?: { [file: string]: boolean };
    /**
     * Results summary output JSON
     */
    outputFile?: string;
    /**
     * Verbose output (false). Takes precedence over 'quiet' if both are true.
     */
    verbose?: boolean;
    /**
     * The opposite of 'verbose' (false).
     */
    quiet?: boolean;
    /**
     * Bail on first failure (false).
     */
    bail?: boolean;
    /**
     * Run suites in parallel.
     */
    parallel?: boolean;
    /**
     * (For use with rowwise values). Number of rows to run per batch.
     */
    batchRows?: number;
    /**
     * (For use with rowwise values). Delay in ms between row batches.
     */
    batchDelay?: number;
    /**
     * Reporter output format. Built-in formats: json, csv, xlsx.
     * See https://github.com/ply-ct/ply-viz for more options.
     */
    reporter?: string;
    /**
     * (When flows have loopback links). Max instance count per step (10). Overridable in flow design.
     */
    maxLoops?: number;
    /**
     * Predictable ordering of response body JSON property keys -- needed for verification (true).
     */
    responseBodySortedKeys?: boolean;
    /**
     * Response headers to exclude when generating expected results.
     */
    genExcludeResponseHeaders?: string[];
    /**
     * Media types to be treated as binary.
     */
    binaryMediaTypes?: string[];
    /**
     * Prettification indent for yaml and response body (2).
     */
    prettyIndent?: number;
}

export class PlyDefaults implements PlyOptions {
    private _expectedLocation?: string;
    private _actualLocation?: string;
    private _logLocation?: string;
    constructor(readonly testsLocation: string = '.') {}
    requestFiles = '**/*.{ply,ply.yaml,ply.yml}';
    caseFiles = '**/*.ply.ts';
    flowFiles = '**/*.ply.flow';
    ignore = '**/{node_modules,bin,dist,out}/**';
    skip = '**/*.ply';
    reporter = '' as any;
    get expectedLocation() {
        if (!this._expectedLocation) {
            this._expectedLocation = this.testsLocation + '/results/expected';
        }
        return this._expectedLocation;
    }
    get actualLocation() {
        if (!this._actualLocation) {
            this._actualLocation = this.testsLocation + '/results/actual';
        }
        return this._actualLocation;
    }
    get logLocation() {
        if (!this._logLocation) {
            this._logLocation = this.actualLocation;
        }
        return this._logLocation;
    }
    resultFollowsRelativePath = true;
    valuesFiles = {};
    verbose = false;
    quiet = false;
    bail = false;
    parallel = false;
    batchRows = 1;
    batchDelay = 0;
    maxLoops = 10;
    responseBodySortedKeys = true;
    genExcludeResponseHeaders = [
        'cache-control',
        'connection',
        'content-length',
        'date',
        'etag',
        'server',
        'transfer-encoding',
        'x-powered-by'
    ];
    binaryMediaTypes = [
        'application/octet-stream',
        'image/png',
        'image/jpeg',
        'image/gif',
        'application/pdf'
    ];
    prettyIndent = 2;
}

export interface RunOptions {
    /**
     * Run test requests but don't verify outcomes.
     */
    submit?: boolean;
    /**
     * Skip verify only if expected result does not exist.
     */
    submitIfExpectedMissing?: boolean;
    /**
     * Create expected from actual and verify based on that.
     */
    createExpected?: boolean;
    /**
     * Create expected from actual only if expected does not exist.
     */
    createExpectedIfMissing?: boolean;

    /**
     * If untrusted, enforce safe expression evaluation without side-effects.
     * Supports a limited subset of template literal expressions.
     * Default is false assuming expressions from untrusted sources are evaluated.
     */
    trusted?: boolean;

    /**
     * Import requests or values from external format (currently 'postman' or 'insomnia' is supported).
     * Overwrites existing same-named files.
     */
    import?: 'postman' | 'insomnia';
    /**
     * Import collections into request suites (.yaml files), instead of individual (.ply) requests.
     */
    importToSuite?: boolean;

    /**
     * Generate report from previously-executed Ply results. See --reporter for options.
     */
    report?: string;

    /**
     * Augment OpenAPI v3 doc at specified path with operation summaries, request/response samples,
     * and code snippets from Ply expected results.
     */
    openapi?: string;

    /**
     * Import case suite modules from generated .js instead of .ts source (default = false).
     * This runOption needs to be set in your case's calls to Suite.run (for requests),
     * and also in originating the call to Suite.run (for the case(s)).
     */
    useDist?: boolean;

    requireTsNode?: boolean;

    /**
     * Runtime override values
     */
    values?: { [key: string]: string };
}
