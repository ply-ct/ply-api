import path from 'path-browserify';
import { PlyDataOptions } from '../../model/data';
import { FileAccess } from '../../model/files';
import * as yaml from '../../util/yaml';
import { Flow, Step, Subflow } from '../../model/flow';

/**
 * TODO: results
 */
export class FlowLoader {
    constructor(private files: FileAccess, private options: PlyDataOptions) {}

    async loadPlyFlows(plyBase: string): Promise<Flow[]> {
        const plyFlows: Flow[] = [];
        const flowFiles = await this.files.getFileList(plyBase, {
            recursive: true,
            patterns: ['**/*.ply.flow']
        });
        for (const path of Object.keys(flowFiles)) {
            try {
                plyFlows.push(this.readPlyFlow(plyBase, path, flowFiles[path]));
            } catch (err: unknown) {
                this.options.logger.error(`${err}`, err);
            }
        }
        return plyFlows;
    }

    async loadPlyFlow(plyBase: string, path: string): Promise<Flow | undefined> {
        const contents = await this.files.readTextFile(path);
        if (contents) {
            return this.readPlyFlow(plyBase, path, contents);
        }
    }

    private readPlyFlow(plyBase: string, relPath: string, contents: string): Flow {
        const flow = yaml.load(relPath, contents) as Flow;
        if (!flow) {
            throw new Error(`Bad ply flow: ${plyBase}/${relPath}`);
        }
        flow.steps?.forEach((step) => (step.name = step.name.replace(/\r?\n/g, ' ')));
        const plyFlow: Flow = {
            name: path.relative(plyBase, relPath),
            path: relPath,
            steps: flow.steps || []
        };
        if (flow.subflows) {
            const subflows: Subflow[] = flow.subflows;
            subflows.forEach((subflow) => {
                subflow.name = subflow.name.replace(/\r?\n/g, ' ');
                subflow.steps?.forEach((s) => (s.name = s.name.replace(/\r?\n/g, ' ')));
            });
            plyFlow.subflows = subflows;
        }
        this.sortSubflowsAndSteps(plyFlow);
        if (this.options.suiteSource) plyFlow.source = contents;
        return plyFlow;
    }

    private sortSubflowsAndSteps(flow: Flow) {
        flow.subflows?.sort((sub1, sub2) => {
            if (sub1.attributes?.when === 'Before' && sub2.attributes?.when !== 'Before') {
                return -1;
            } else if (sub2.attributes?.when === 'Before' && sub1.attributes?.when !== 'Before') {
                return 1;
            }
            if (sub1.attributes?.when === 'After' && sub2.attributes?.when !== 'After') {
                return 1;
            } else if (sub2.attributes?.when === 'After' && sub1.attributes?.when !== 'After') {
                return -1;
            }
            return sub1.id.localeCompare(sub2.id);
        });

        const addSteps = (flow: Flow | Subflow, start: Step, steps: Step[]) => {
            if (flow.steps && !steps.find((step) => step.id === start.id)) {
                steps.push(start);
                if (start.links) {
                    for (const link of start.links) {
                        const outStep = flow.steps.find((step) => step.id === link.to);
                        if (outStep) {
                            addSteps(flow, outStep, steps);
                        }
                    }
                }
            }
        };

        const flowStart = flow.steps.find((step) => step.path === 'start');
        if (flowStart) {
            const steps: Step[] = [];
            addSteps(flow, flowStart, steps);
            flow.steps = steps;
        }

        flow.subflows?.forEach((subflow) => {
            const subStart = subflow.steps?.find((step) => step.path === 'start');
            if (subStart) {
                const steps: Step[] = [];
                addSteps(subflow, subStart, steps);
                subflow.steps = steps;
            }
        });
    }
}
