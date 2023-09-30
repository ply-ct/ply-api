import { Logger } from './log';

export interface DescriptorLoadOptions {
    path?: string;
    templateBase?: string;
    withRuntime?: boolean;
    runtimeTemplateBase?: string;
    iconBase?: string;
    iconTheme?: 'light' | 'dark';
    inlineSvg?: boolean;
    logger?: Logger;
}

const nodePath = 'node_modules/@ply-ct/ply-api';
export const standardDescriptorDefaults: DescriptorLoadOptions = {
    path: `${nodePath}/templates/descriptors.yaml`,
    templateBase: `${nodePath}/templates/config`,
    runtimeTemplateBase: `${nodePath}/templates/inspect`,
    iconBase: `${nodePath}/public/img/icons`,
    iconTheme: 'light'
};
export const customDescriptorDefaults: DescriptorLoadOptions = {
    // ain't none
};

export type DescriptorType = 'flow' | 'step' | 'subflow' | 'note';

export interface Descriptor {
    path: string;
    name: string;
    type: DescriptorType;
    icon?:
        | string
        | {
              src: string;
              width?: number;
              height?: number;
          };
    template?: ConfigTemplate | string; // translates to attributes
    runtimeTemplate?: ConfigTemplate; // for inspect mode
    link?: {
        label: string;
        url: string;
    };
}

export type ConfigTemplate = {
    [key: string]: { widgets: Widget[] };
};

export type WidgetType =
    | 'text'
    | 'button'
    | 'checkbox'
    | 'radio'
    | 'textarea'
    | 'code'
    | 'select'
    | 'date'
    | 'datetime'
    | 'number'
    | 'table'
    | 'note'
    | 'link'
    | 'file'
    | 'source';

export interface Widget {
    type: WidgetType;
    attribute?: string;
    /**
     * Prop name for instance value
     */
    instanceProp?: string;
    instanceEdit?: boolean;
    /**
     * Label when rendered in Configurator.
     * No label means span tab width.
     */
    label?: string;
    /**
     * Options for select or list widgets.
     */
    options?: string[] | ((attribute?: string) => string[]);
    /**
     * Sub-widgets for tables.
     */
    widgets?: Widget[];
    readonly?: boolean;
    /**
     * Default value.
     * Set this for selects so that attribute will be populated with first value.
     */
    default?: string | ((element: { attributes?: { [key: string]: string } }) => string);
    min?: number;
    max?: number;
    /**
     * For select: multiple select
     * For table: multiple lines (defaults to true)
     */
    multi?: boolean;
    action?: string;
    /**
     * HTML title (only for readonly, non-decorated)
     */
    title?: string | ((val?: string) => string | undefined);
}
