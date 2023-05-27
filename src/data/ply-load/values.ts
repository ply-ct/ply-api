import { PlyDataOptions } from '../../model/data';
import { FileAccess } from '../../model/files';
import { ValuesHolder } from '../../model/value';
import { ActualResults } from '../../model/result';
import { TestType } from '../../model/test';
import * as yaml from '../../util/yaml';

export class ValuesLoader {
    constructor(private files: FileAccess, private options?: PlyDataOptions) {}

    /**
     * @param valuesFiles files or urls
     */
    async loadFileValues(valuesFiles: string[]): Promise<ValuesHolder[]> {
        const valuesHolders: ValuesHolder[] = [];
        for (const valuesFile of valuesFiles) {
            const contents = await this.files.readTextFile(valuesFile);
            if (contents) {
                valuesHolders.push({ values: contents, location: { path: valuesFile } });
            } else {
                console.error(`Values file does not exist: ${valuesFile}`);
            }
        }
        return valuesHolders;
    }

    /**
     * Includes request and response object values
     */
    readRequestRefValues(actualResults: ActualResults): ValuesHolder[] {
        return this.readRefValues(actualResults, 'request');
    }

    /**
     * Includes request and response object values
     */
    readFlowRefValues(actualResults: ActualResults): ValuesHolder[] {
        return this.readRefValues(actualResults, 'flow');
    }

    private readRefValues(actualResults: ActualResults, testType: TestType): ValuesHolder[] {
        const valuesHolders: ValuesHolder[] = [];
        try {
            const resultVals: any = {};
            const obj = yaml.load(actualResults.path, actualResults.contents);
            if (typeof obj === 'object') {
                if (testType === 'request') {
                    for (const key of Object.keys(obj)) {
                        if (obj.request) {
                            resultVals[key] = this.readResult(obj);
                        }
                    }
                } else if (testType === 'flow') {
                    for (const key of Object.keys(obj)) {
                        const flowObj = obj[key];
                        if (flowObj.id?.startsWith('f')) {
                            for (const subKey of Object.keys(flowObj)) {
                                const subObj = flowObj[subKey];
                                if (subObj.request) {
                                    resultVals[`${flowObj.id}.${subObj.id}`] =
                                        this.readResult(subObj);
                                }
                            }
                        } else if (flowObj.id?.startsWith('s') && flowObj.request) {
                            resultVals[flowObj.id] = this.readResult(flowObj);
                        }
                    }
                }
            }
            valuesHolders.push({ values: resultVals, location: { path: actualResults.path } });
        } catch (err: unknown) {
            console.error(err);
            this.options?.logger?.error(`Cannot process results: ${actualResults.path}`);
            this.options?.logger?.error(`${err}`);
        }
        return valuesHolders;
    }

    private readResult(obj: any) {
        const request = obj.request;
        if (typeof request.body === 'string' && request.body.startsWith('{')) {
            request.body = JSON.parse(request.body);
        }
        const response = obj.response;
        if (typeof response.body === 'string' && response.body.startsWith('{')) {
            response.body = JSON.parse(response.body);
        }
        return { request, response };
    }
}
