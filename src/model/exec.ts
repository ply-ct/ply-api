import { Logger } from './log';

export interface ExecOptions {
    cwd: string;
    message?: string;
    logger: Logger;
}

export interface Executor {
    exec(cmd: string, options: ExecOptions): Promise<number>;
}
