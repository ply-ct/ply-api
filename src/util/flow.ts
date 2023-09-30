import { Flow, FlowReturn, FlowValue, Step, SubflowSpec } from '../model/flow';

export const getStepForFragment = (flow: Flow, fragment: string): Step | undefined => {
    const dot = fragment.indexOf('.');
    if (dot > 0 && dot < fragment.length - 1 && flow.subflows) {
        const subflow = flow.subflows.find((sub) => sub.id === fragment.substring(0, dot));
        return subflow?.steps?.find((step) => step.id === fragment.substring(dot + 1));
    } else {
        return flow.steps.find((step) => step.id === fragment);
    }
};

export const getSubflowSteps = (flow: Flow): Step[] => {
    let subflowSteps = flow.steps?.filter((s) => s.path.endsWith('subflow'));
    if (flow.subflows) {
        for (const subflow of flow.subflows) {
            if (subflow.steps) {
                subflowSteps = [
                    ...subflowSteps,
                    ...subflow.steps.filter((s) => s.path.endsWith('subflow'))
                ];
            }
        }
    }
    return subflowSteps;
};

export const getSubflowSpec = (step: Step, subflow: Flow): SubflowSpec => {
    const spec: SubflowSpec = { stepId: step.id };
    if (step.attributes?.subflow) spec.subflow = step.attributes.subflow;
    if (subflow.attributes?.values) {
        const rows = JSON.parse(subflow.attributes.values);
        for (const row of rows) {
            if (row.length > 0) {
                const flowVal: FlowValue = { name: row[0] };
                if (row.length > 1 && row[1]) flowVal.value = row[1];
                if (row.length > 2 && row[2]) flowVal.required = row[2] === 'true';
                if (row.length > 3 && row[3]) flowVal.requiredIf = row[3];
                if (!spec.values) spec.values = [];
                spec.values.push(flowVal);
            }
        }
        spec.values?.sort((v1, v2) => v1.name.localeCompare(v2.name));
    }
    if (subflow.attributes?.return) {
        const rows = JSON.parse(subflow.attributes.return);
        for (const row of rows) {
            if (row.length > 0) {
                const flowRet: FlowReturn = { name: row[0] };
                if (row.length > 1 && row[1]) flowRet.expression = row[1];
                if (!spec.returns) spec.returns = [];
                spec.returns.push(flowRet);
            }
        }
        spec.returns?.sort((r1, r2) => r1.name.localeCompare(r2.name));
    }

    return spec;
};
