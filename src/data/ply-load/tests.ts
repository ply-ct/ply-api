import { PlyDataOptions } from '../../model/data';
import { FileAccess } from '../../model/files';
import { Flow, Subflow } from '../../model/flow';
import { TestFile, TestFiles } from '../../model/test';
import { sortSubflowsAndSteps } from '../../util/flow';
import * as yaml from '../../util/yaml';

export class TestFileLoader {
    constructor(private files: FileAccess, private options: PlyDataOptions) {}

    async loadTestFiles(plyBase: string): Promise<TestFiles> {
        const fileList = await this.files.getFileList(plyBase, {
            recursive: true,
            patterns: ['**/*.ply.yaml', '**/*.ply.yml', '**/*.ply', '**/*.ply.flow', '**/*.ply.ts']
        });

        const testFiles: TestFiles = {
            ply: {
                base: plyBase
            },
            files: []
        };
        for (const file of Object.keys(fileList)) {
            const contents = fileList[file];
            try {
                if (file.endsWith('.ply.flow')) {
                    testFiles.files.push(this.readFlowFile(plyBase, file, contents));
                } else if (file.endsWith('.ply.ts')) {
                    // TODO: case file
                } else {
                    testFiles.files.push(this.readRequestFile(plyBase, file, contents));
                }
            } catch (err: unknown) {
                this.options.logger.error(`${err}`, err);
                if (!testFiles.errors) testFiles.errors = [];
                testFiles.errors.push({
                    file: file,
                    message: `${err}`
                });
            }
        }

        testFiles.files.sort((tf1, tf2) => tf1.path.localeCompare(tf2.path));
        return testFiles;
    }

    readRequestFile(plyBase: string, file: string, contents: string): TestFile {
        const requestsObj = yaml.load(file, contents, true) as {
            [name: string]: { name: string; __start: number; __end: number };
        };
        if (!requestsObj) {
            throw new Error(`Bad ply request: ${file}`);
        }
        return {
            path: plyBase === '.' ? file : file.substring(plyBase.length + 1),
            type: 'request',
            tests: Object.keys(requestsObj).map((name) => {
                const req = requestsObj[name];
                return {
                    id: name,
                    name: name,
                    __start: req.__start,
                    __end: req.__end
                };
            })
        };
    }

    readFlowFile(plyBase: string, file: string, contents: string): TestFile {
        const flowObj = yaml.load(file, contents, true) as Flow;
        if (!flowObj) {
            throw new Error(`Bad ply flow: ${file}`);
        }
        flowObj.steps?.forEach((step) => (step.name = step.name.replace(/\r?\n/g, ' ')));
        if (flowObj.subflows) {
            const subflows: Subflow[] = flowObj.subflows;
            subflows.forEach((subflow) => {
                subflow.name = subflow.name.replace(/\r?\n/g, ' ');
                subflow.steps?.forEach((s) => (s.name = s.name.replace(/\r?\n/g, ' ')));
            });
        }
        sortSubflowsAndSteps(flowObj);
        const testFile: TestFile = {
            path: plyBase === '.' ? file : file.substring(plyBase.length + 1),
            type: 'flow',
            tests: []
        };
        const befSubs = (flowObj.subflows || []).filter((sub) => sub.attributes?.when === 'Before');
        for (const befSub of befSubs) {
            testFile.tests.push(
                ...(befSub.steps || []).map((step) => {
                    return {
                        id: `${befSub.id}-${step.id}`,
                        name: step.name,
                        path: step.path
                    };
                })
            );
        }
        testFile.tests.push(
            ...flowObj.steps.map((step) => {
                return {
                    id: step.id,
                    name: step.name,
                    path: step.path
                };
            })
        );
        const aftSubs = (flowObj.subflows || []).filter((sub) => sub.attributes?.when === 'After');
        for (const aftSub of aftSubs) {
            testFile.tests.push(
                ...(aftSub.steps || []).map((step) => {
                    return {
                        id: `${aftSub.id}-${step.id}`,
                        name: step.name,
                        path: step.path
                    };
                })
            );
        }

        return testFile;
    }
}
