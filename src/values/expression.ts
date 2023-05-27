import { Flow } from '../model/flow';
import { PlyRequest } from '../model/request';

export interface Expression {
    text: string;
    start: number;
    end: number;
}

export const findExpressions = (line: string): Expression[] => {
    const expressions: Expression[] = [];
    const regex = /\$\{.+?\}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
        const text = match[0];
        expressions.push({ text, start: match.index, end: match.index + text.length - 1 });
    }
    return expressions;
};

export const isRegex = (expression: string): boolean => {
    return expression.startsWith('${~');
};

export const isRef = (expression: string): boolean => {
    return expression.startsWith('${@');
};

export const replaceRefs = (expression: string, holder: string): string => {
    return expression.replace(/\${@\[/g, '${' + holder + '[').replace(/\${@/g, '${' + holder + '.');
};

export type ExpressionHolder = PlyRequest | Flow;
export const isRequest = (holder: ExpressionHolder): holder is PlyRequest => {
    return !!(holder as PlyRequest).method && !!(holder as PlyRequest).url;
};

export const expressions = (holder: ExpressionHolder): string[] => {
    if (isRequest(holder)) {
        return requestExpressions(holder);
    } else {
        return flowExpressions(holder);
    }
};

export const requestExpressions = (request: PlyRequest, withRefs = false): string[] => {
    let expressions = [
        ...getExpressions(request.method),
        ...getExpressions(request.url),
        ...Object.keys(request.headers).reduce((exprs, key) => {
            exprs = [...exprs, ...getExpressions(request.headers[key])];
            return exprs;
        }, [] as string[])
    ];
    if (request.body) {
        expressions = [...expressions, ...getExpressions(request.body)];
    }
    return expressions.filter((expr, i) => {
        if (expr.startsWith('${@') && !withRefs) return false;
        return !expressions.slice(0, i).includes(expr); // no dups
    });
};

export const flowExpressions = (flow: Flow): string[] => {
    let expressions: string[] = [];
    if (flow.attributes?.values) {
        const rows: string[][] = JSON.parse(flow.attributes.values);
        expressions = rows.reduce((exprs, row) => {
            exprs.push(`\${${row[0]}}`);
            return exprs;
        }, []);
    }

    const attributeExpressions = (attributes?: { [key: string]: string }): string[] => {
        if (attributes) {
            return Object.values(attributes).reduce((exprs, attrKey) => {
                exprs.push(...getExpressions(attributes[attrKey]));
                return exprs;
            }, [] as string[]);
        }
        return [];
    };

    if (flow.steps) {
        flow.steps.forEach(
            (step) => (expressions = [...expressions, ...attributeExpressions(step.attributes)])
        );
    }
    if (flow.subflows) {
        flow.subflows.forEach((subflow) => {
            expressions = [...expressions, ...attributeExpressions(subflow.attributes)];
            if (subflow.steps) {
                subflow.steps.forEach(
                    (step) =>
                        (expressions = [...expressions, ...attributeExpressions(step.attributes)])
                );
            }
        });
    }

    return expressions;
};

export const getExpressions = (content: string): string[] => {
    return content.match(/\$\{.+?}/g) || [];
};
