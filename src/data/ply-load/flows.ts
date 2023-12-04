import { PlyDataOptions } from '../../model/data';
import { FileAccess } from '../../model/files';
import * as yaml from '../../util/yaml';
import { Flow, Subflow } from '../../model/flow';
import { sortSubflowsAndSteps } from '../../util/flow';

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
        if (contents !== undefined) {
            return this.readPlyFlow(plyBase, path, contents);
        }
    }

    /**
     * @param relPath must be relative
     */
    private readPlyFlow(plyBase: string, relPath: string, contents: string): Flow {
        const flow = yaml.load(relPath, contents) as Flow;
        if (!flow) {
            throw new Error(`Bad ply flow: ${plyBase}/${relPath}`);
        }
        if (this.options.collapseNames) {
            flow.steps?.forEach((step) => (step.name = step.name.replace(/\r?\n/g, ' ')));
        }
        const plyFlow: Flow = {
            name: relPath === '.' ? relPath : relPath.substring(plyBase.length + 1),
            path: relPath,
            attributes: flow.attributes,
            steps: flow.steps || []
        };
        if (flow.subflows) {
            const subflows: Subflow[] = flow.subflows;
            subflows.forEach((subflow) => {
                if (this.options.collapseNames) {
                    subflow.name = subflow.name.replace(/\r?\n/g, ' ');
                    subflow.steps?.forEach((s) => (s.name = s.name.replace(/\r?\n/g, ' ')));
                }
            });
            plyFlow.subflows = subflows;
        }
        sortSubflowsAndSteps(plyFlow);
        if (this.options.suiteSource) plyFlow.source = contents;
        return plyFlow;
    }
}
