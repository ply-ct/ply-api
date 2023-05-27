import { relative } from 'path';
import { PlyDataOptions } from '../../model/data';
import { FileAccess } from '../../model/files';
import { PlyRequest } from '../../model/request';
import { RequestSuite } from '../../model/test';
import * as yaml from '../../util/yaml';

export class RequestLoader {
    constructor(private files: FileAccess, private options?: PlyDataOptions) {}

    /**
     * TODO: results
     */
    async loadPlyRequests(plyBase: string): Promise<RequestSuite[]> {
        const requestSuites: RequestSuite[] = [];
        const requestFiles = await this.files.getFileList(plyBase, {
            recursive: true,
            patterns: ['**/*.ply.yaml', '**/*.ply.yml', '**/*.ply']
        });
        for (const path of Object.keys(requestFiles)) {
            try {
                requestSuites.push(await this.readRequestSuite(plyBase, path, requestFiles[path]));
            } catch (err: unknown) {
                this.options?.logger?.error(`${err}`, err);
            }
        }
        return requestSuites;
    }

    public async loadRequestSuite(
        plyBase: string,
        path: string
    ): Promise<RequestSuite | undefined> {
        const contents = await this.files.readTextFile(path);
        if (contents) {
            return this.readRequestSuite(plyBase, path, contents);
        }
    }

    private readRequestSuite(plyBase: string, path: string, contents: string): RequestSuite {
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
        if (this.options?.suiteSource) requestSuite.source = contents;
        return requestSuite;
    }
}
