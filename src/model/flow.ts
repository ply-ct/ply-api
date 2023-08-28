import { Suite } from './test';

export interface Flow extends Suite {
    attributes?: { [key: string]: string };
    steps: Step[];
    subflows?: Subflow[];
}

export interface Step {
    id: string;
    name: string;
    /**
     * Logical path for descriptor, or for custom steps
     * this is the module path to ts file.
     */
    path: string;
    attributes?: { [key: string]: string };
    type?: 'step';
    links?: Link[];
}

export interface Link {
    id: string;
    to: string;
    attributes?: { [key: string]: string };
    type?: 'link';
    event?: 'Finish' | 'Error' | 'Cancel' | 'Delay' | 'Resume';
    result?: string;
}

export interface Subflow {
    id: string;
    name: string;
    steps?: Step[];
    attributes?: { [key: string]: string };
    type?: 'subflow';
}

export type FlowElementStatus =
    | 'Pending'
    | 'In Progress'
    | 'Waiting'
    | 'Failed'
    | 'Errored'
    | 'Completed'
    | 'Canceled';

export interface FlowInstance {
    id: string;
    runId?: string;
    flowPath: string;
    status: FlowElementStatus;
    stepInstances?: StepInstance[];
    subflowInstances?: SubflowInstance[];
    values?: { [key: string]: string | boolean | number | Date | object };
    start?: Date;
    end?: Date;
    data?: any;
}

export interface StepInstance {
    id: string;
    flowInstanceId: string;
    stepId: string;
    status: FlowElementStatus;
    message?: string;
    result?: string;
    start?: Date;
    end?: Date;
    data?: any;
}

export interface SubflowInstance {
    id: string;
    flowInstanceId: string;
    subflowId: string;
    status: FlowElementStatus;
    stepInstances?: StepInstance[];
    start?: Date;
    end?: Date;
}
