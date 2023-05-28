import { Outcome } from './result';
import { TestType } from './test';
import { FlowInstance, StepInstance, SubflowInstance } from './flow';

export interface Listener<T> {
    (event: T): any;
}

/**
 * Event for 'start' listeners.
 */

export interface PlyEvent {
    /**
     * Unique test/suite path
     */
    plyee: string;
}

/**
 * Event for 'outcome' listeners.
 */
export interface OutcomeEvent extends PlyEvent {
    outcome: Outcome;
}

export interface SuiteEvent extends PlyEvent {
    type: TestType;
    status: 'Started' | 'Finished';
}

export type PlyEventListener = (e: PlyEvent) => void;

export type FlowEventType = 'start' | 'exec' | 'finish' | 'error';
export type FlowElementType = 'flow' | 'step' | 'link' | 'subflow' | 'note';

export interface FlowEvent {
    eventType: FlowEventType;
    elementType: FlowElementType;
    flowPath: string;
    flowInstanceId: string;
    instance: FlowInstance | SubflowInstance | StepInstance;
}
