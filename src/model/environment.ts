export interface Environment {
    name: string;
    health?: string;
    valuesFiles?: string[];
    values?: { [key: string]: string };
    testkube?: {
        api: string;
        ws?: string;
        args?: string[];
    };
}
