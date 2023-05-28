import { merge } from 'merge-anything';
import traverse from 'traverse';
import { LocatedValue, ValuesHolder, EvalOptions } from '../model/value';
import { resolveIf } from './resolve';
import { isRef, replaceRefs } from './expression';

/**
 * Values with substituted environment values.
 */
export class Values {
    private valuesHolders: ValuesHolder[];
    private locatedValues: { [expr: string]: LocatedValue | null } = {};
    private values?: object;

    constructor(valuesHolders: ValuesHolder[], private options?: EvalOptions) {
        // reverse so that later values have precedence
        this.valuesHolders = [...valuesHolders].reverse();
    }

    getValue(expression: string): LocatedValue | undefined {
        let value = this.locatedValues[expression];
        if (value === undefined) {
            value = this.findValue(expression);
            if (value !== undefined) {
                this.locatedValues[expression] = value;
            }
        }
        return value || undefined;
    }

    private findValue(expression: string): LocatedValue | null {
        let expr = expression;
        if (isRef(expr) && this.options?.refHolder) {
            expr = replaceRefs(expr, this.options.refHolder);
        }
        for (const valuesHolder of this.valuesHolders) {
            const values = this.substEnvVars(valuesHolder.values);
            const value = resolveIf(expression, values, this.options?.trusted);
            if (value) return { value, location: valuesHolder.location };
        }
        return null;
    }

    /**
     * Returns merged values
     */
    getValues(): object {
        if (!this.values) {
            this.values = this.mergeValues();
        }
        return this.values;
    }

    private mergeValues(): object {
        let values: any = {};
        for (const valuesHolder of this.valuesHolders) {
            values = merge(values, this.substEnvVars(valuesHolder.values));
        }
        return values;
    }

    private substEnvVars(values: any): any {
        // operate on a clone
        const vals = JSON.parse(JSON.stringify(values));
        const envVars = this.options?.env || {};
        traverse(vals).forEach(function (val) {
            if (typeof val === 'string') {
                const envVar = val.match(/^\$\{.+?}/);
                if (envVar && envVar.length === 1) {
                    const varName = envVar[0].substring(2, envVar[0].length - 1);
                    let varVal: any = envVars[varName];
                    if (typeof varVal === 'undefined' && val.trim().length > varName.length + 3) {
                        // fallback specified?
                        const extra = val.substring(envVar[0].length).trim();
                        if (extra.startsWith('||')) {
                            varVal = extra.substring(1).trim();
                        }
                    }
                    this.update(varVal);
                }
            }
        });
        return vals;
    }
}
