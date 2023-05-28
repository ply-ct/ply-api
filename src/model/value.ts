export interface EvalOptions {
    trusted?: boolean;
    refHolder?: string;
    env?: EnvironmentVariables;
}

export type EnvironmentVariables = { [key: string]: string | undefined };

export interface ValuesLocation {
    /**
     * File or URL
     */
    path: string;
    /**
     * someday maybe
     */
    line?: number;
}

export interface LocatedValue {
    value: string;
    location?: ValuesLocation;
}

export interface ValuesHolder {
    /**
     * Values object or JSON string
     */
    values: object | string;
    location?: ValuesLocation;
    /**
     * Required value names
     */
    required?: string[];
}
