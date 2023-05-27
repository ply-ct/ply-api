import { PlyDataOptions } from '../../model/data';
import { FileAccess, FileList } from '../../model/files';
import * as yaml from '../../util/yaml';
import { ApiExpectedResult } from '../../model/result';

export class ExpectedResultsLoader {
    constructor(private files: FileAccess, private options?: PlyDataOptions) {}

    async loadApiExpectedResults(plyBase: string): Promise<ApiExpectedResult[]> {
        const plyExpectedResults: ApiExpectedResult[] = [];
        if (plyBase) {
            const expectedPath = `${plyBase}/results/expected`;
            let resultFiles: FileList = {};
            try {
                resultFiles = await this.files.getFileList(expectedPath, {
                    patterns: ['**/*.yaml'],
                    recursive: true
                });
            } catch (err: unknown) {
                this.options?.logger?.error(`File access error: ${err}`);
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
