import { Logger } from './log';

export interface DescriptorLoadOptions {
    path?: string;
    inlineSvg?: boolean;
    templateBase?: string;
    withRuntime?: boolean;
    runtimeTemplateBase?: string;
    iconBase?: string;
    iconTheme?: 'light' | 'dark';
    logger?: Logger;
}

export type DescriptorType = 'step' | 'subflow' | 'note';

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
    instanceProp?: string;
    instanceEdit?: boolean;
    label?: string;
    options?: string[] | ((attribute?: string) => string[]);
    widgets?: Widget[];
    readonly?: boolean;
    default?: string | ((element: { attributes?: { [key: string]: string } }) => string);
    min?: number;
    max?: number;
    multi?: boolean;
    action?: string;
}
