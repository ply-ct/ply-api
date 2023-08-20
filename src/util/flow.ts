import { Flow, Step } from '../model/flow';

export const getStepForFragment = (flow: Flow, fragment: string): Step | undefined => {
    const dot = fragment.indexOf('.');
    if (dot > 0 && dot < fragment.length - 1 && flow.subflows) {
        const subflow = flow.subflows.find((sub) => sub.id === fragment.substring(0, dot));
        return subflow?.steps?.find((step) => step.id === fragment.substring(dot + 1));
    } else {
        return flow.steps.find((step) => step.id === fragment);
    }
};
