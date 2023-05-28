import { FileAccess } from '../../model/files';
import { ValuesHolder, EvalOptions } from '../../model/value';
import { ActualResults } from '../../model/result';
import { TestType } from '../../model/test';
import { Flow } from '../../model/flow';
import { Logger } from '../../model/log';
import * as yaml from '../../util/yaml';
import { isExpression, toExpression } from '../../values/expression';
import { resolveIf } from '../../values/resolve';

export class ValuesLoader {
    constructor(private files: FileAccess, private options: EvalOptions & { logger: Logger }) {}

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
                this.options.logger.error(`Values file does not exist: ${valuesFile}`);
            }
        }
        return valuesHolders;
    }

    /**
     * Includes request and response object values
     */
    readRequestRefValues(actualResults: ActualResults): ValuesHolder {
        return this.readRefValues(actualResults, 'request');
    }

    /**
     * Includes request and response object values
     */
    readFlowRefValues(actualResults: ActualResults): ValuesHolder {
        return this.readRefValues(actualResults, 'flow');
    }

    private readRefValues(actualResults: ActualResults, testType: TestType): ValuesHolder {
        const resultVals: any = {};
        try {
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
        } catch (err: unknown) {
            this.options.logger.error(`Cannot process results: ${actualResults.path}`, err);
        }
        return { values: resultVals, location: { path: actualResults.path } };
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

    /**
     * Evaluated flow values
     */
    readFlowValues(flow: Flow, evalContext?: object): ValuesHolder {
        const flowVals: any = {};
        if (flow.attributes?.values) {
            const required: string[] = [];
            const rows = JSON.parse(flow.attributes.values);
            const context = evalContext || {};
            const trusted = this.options.trusted;
            for (const row of rows) {
                if (row.length > 0) {
                    const valName = row[0];
                    let valVal: string | undefined;
                    if (row.length > 1 && rows[1]) {
                        valVal = rows[1];
                        if (isExpression(valVal!)) {
                            valVal = resolveIf(valVal!, context, trusted);
                        }
                        if (row.length > 2) {
                            let reqd = row[2] === 'true';
                            if (row.length > 3) {
                                let expr = row[3];
                                if (expr) {
                                    if (!isExpression(expr)) expr = toExpression(expr);
                                    reqd = resolveIf(expr, context, trusted) === 'true';
                                }
                            }
                            if (reqd) required.push(valName);
                        }
                        flowVals[valName] = valVal;
                    }
                }
            }
        }
        return { values: flowVals, location: { path: flow.path } };
    }
}
