import { isJson, loadContent } from '../../util/content';
import { FileAccess } from '../../model/files';
import { ConfigTemplate, Descriptor, DescriptorLoadOptions } from '../../model/descriptor';
import { parseJsonc } from '../../util/json';

export class DescriptorsLoader {
    private static nodePath = 'node_modules/@ply-ct/ply-api';

    constructor(private files: FileAccess, readonly options: DescriptorLoadOptions) {}

    async loadStandardDescriptors(): Promise<Descriptor[]> {
        const path =
            this.options.path || `${DescriptorsLoader.nodePath}/templates/descriptors.yaml`;
        const yaml = await this.files.readTextFile(path);
        if (yaml === undefined) throw new Error(`File not found: ${path}`);
        const descriptorsObj = loadContent(yaml, path);
        const descriptors: Descriptor[] = [];
        for (const descriptorPath of Object.keys(descriptorsObj)) {
            const descriptor: Descriptor = {
                path: descriptorPath,
                ...descriptorsObj[descriptorPath]
            };
            descriptors.push(await this.loadDescriptor(descriptor));
        }
        return descriptors;
    }

    async loadCustomDescriptors(): Promise<Descriptor[]> {
        if (!this.options.path) return [];
        const fileList = await this.files.getFileList(this.options.path, {
            patterns: ['**/*.json', '**/*.yaml']
        });
        const descriptors: Descriptor[] = [];
        for (const descriptorPath of Object.keys(fileList)) {
            const descriptor: Descriptor = {
                path: descriptorPath,
                ...loadContent(fileList[descriptorPath])
            };
            descriptors.push(await this.loadDescriptor(descriptor));
        }
        return descriptors;
    }

    /**
     * Populates template with loaded ConfigTemplate (also runtimeTemplate if found).
     * Inline svgs if option specified.
     */
    private async loadDescriptor(descriptor: Descriptor): Promise<Descriptor> {
        const descrip = { ...descriptor };
        if (!(typeof descrip.template === 'object')) {
            descrip.template = await this.loadTemplate(descrip);
        }
        if (this.options.withRuntime && !(typeof descrip.runtimeTemplate === 'object')) {
            descrip.runtimeTemplate = await this.loadTemplate(descrip, true);
        }

        if (descrip.icon && this.options.inlineSvg) {
            const icon = typeof descrip.icon === 'string' ? descrip.icon : descrip.icon.src;
            if (icon.endsWith('.svg')) {
                const iconTheme = this.options.iconTheme || 'light';
                const iconPath = this.options.iconBase
                    ? `${this.options.iconBase}/${iconTheme}/${icon}`
                    : icon;
                const iconContent = await this.files.readTextFile(iconPath);
                if (iconContent) {
                    if (typeof descrip.icon === 'string') {
                        descrip.icon = iconContent;
                    } else {
                        descrip.icon.src = iconContent;
                    }
                } else {
                    (this.options.logger || console).error(`Icon not found: ${iconPath}`);
                }
            }
        }
        return descrip;
    }

    private baseStep: ConfigTemplate = {};
    private baseStepInst: ConfigTemplate = {};

    /**
     * Loads config template, extending from base template if step. TODO: support .json
     */
    private async loadTemplate(
        descriptor: Descriptor,
        runtime = false
    ): Promise<ConfigTemplate | undefined> {
        let base: string;
        if (runtime) {
            base =
                this.options.runtimeTemplateBase ||
                `${DescriptorsLoader.nodePath}/templates/inspect`;
        } else {
            base = this.options.templateBase || `${DescriptorsLoader.nodePath}/templates/config`;
        }

        let baseTemplate = {};
        if (descriptor.type === 'step') {
            if (runtime) {
                if (Object.keys(this.baseStepInst).length === 0) {
                    const stepPath = `${base}/step.yaml`;
                    const stepStr = await this.files.readTextFile(stepPath);
                    if (stepStr) {
                        this.baseStepInst = loadContent(stepStr, stepPath);
                    } else {
                        (this.options.logger || console).error(
                            `Base step template not found: ${stepPath}`
                        );
                    }
                }
                baseTemplate = this.baseStepInst;
            } else {
                if (Object.keys(this.baseStep).length === 0) {
                    const stepPath = `${base}/step.yaml`;
                    const stepStr = await this.files.readTextFile(stepPath);
                    if (stepStr) {
                        this.baseStep = loadContent(stepStr, stepPath);
                    } else {
                        (this.options.logger || console).error(
                            `Base step template not found: ${stepPath}`
                        );
                    }
                }
                baseTemplate = this.baseStep;
            }
        }

        let template: ConfigTemplate | undefined;
        let descripTempl = runtime ? descriptor.runtimeTemplate : descriptor.template;
        if (!descripTempl) descripTempl = descriptor.path;
        if (typeof descripTempl === 'string') {
            if (isJson(descripTempl)) {
                template = parseJsonc(descriptor.path, descripTempl);
            } else {
                let templatePath = `${base}/${descripTempl}`;
                if (templatePath) {
                    if (templatePath.endsWith('.ts')) {
                        // TODO: when is this this case?
                    } else {
                        templatePath = `${templatePath}.yaml`;
                        const yaml = await this.files.readTextFile(templatePath);
                        if (yaml) {
                            template = loadContent(yaml, templatePath);
                        }
                    }
                }
            }
        }

        if (template) {
            if (runtime) {
                return { ...baseTemplate, ...template };
            } else {
                return { ...template, ...baseTemplate };
            }
        } else {
            return baseTemplate;
        }
    }

    async readTemplate() {}
}
