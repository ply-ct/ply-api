import * as process from 'process';
import * as path from 'path';
import { promisify } from 'util';
import {
    execFile as cpExecFile,
    PromiseWithChild,
    ExecOptions as CpExecOptions
} from 'child_process';
import { lines } from './content';
import { Logger } from '../model/log';

export interface ExecOptions extends CpExecOptions {
    log?: boolean;
    timed?: boolean;
    message?: string;
    winBase?: string;
    logger: Logger;
}

const ENOENT = 127;

export class Exec {
    private defaultOpts: ExecOptions = {
        cwd: '.',
        log: true,
        winBase: '',
        logger: console
    };

    readonly options: ExecOptions;

    private execFile: {
        (command: string, args: string[], options?: CpExecOptions): PromiseWithChild<{
            stdout: string;
            stderr: string;
        }>;
    };

    constructor(private opts?: ExecOptions) {
        this.options = { ...this.defaultOpts, ...(opts || {}) };
        this.execFile = promisify(cpExecFile);
    }

    private async doRun(cmd: string, logStdErr = true): Promise<string | number> {
        const before = new Date().getTime();
        try {
            let msg = this.options.message || `Running: '${cmd}'`;
            if (this.options.log) {
                if (this.opts?.cwd) msg += ` in directory ${this.options.cwd}`;
                this.options.logger.log(`${msg}`);
            }
            const [file, args] = this.parseArgs(cmd);
            const { stdout, stderr } = await this.execFile(file, args, this.options);
            if (logStdErr && stderr) this.options.logger.error(`  ${stderr}`);
            if (this.options.timed) {
                this.options.logger.log(`Exec completed in ${new Date().getTime() - before} ms`);
            }
            return stdout;
        } catch (err: any) {
            if (this.options.timed) {
                this.options.logger.log(`Exec errored in ${new Date().getTime() - before} ms`);
            }
            if (err.code === 'ENOENT') {
                if (this.options.log) this.options.logger.error(`Command not found: ${cmd}`);
                return ENOENT;
            } else {
                if (logStdErr) this.options.logger.error(err);
                return -1;
            }
        }
    }

    async run(cmd: string, retry?: boolean) {
        let res = await this.doRun(cmd, !retry);
        if (typeof res === 'string') {
            return res;
        } else {
            if (res === ENOENT) {
                const [file, args] = this.parseArgs(cmd);
                const argLine = args.join(' ');
                if (retry === undefined) retry = !path.isAbsolute(file);
                if (retry) {
                    if (this.isWindows) {
                        if (this.options.winBase) {
                            res = await this.doRun(
                                `"C:\\Program Files\\${this.options.winBase}\\${file}" ${argLine}`
                            );
                        }
                        if (res === ENOENT || !this.options.winBase) {
                            const whereOut = await this.doRun(`where ${file}`, false);
                            if (typeof whereOut === 'string') {
                                const outLines = lines(whereOut.trim());
                                const runCmd =
                                    outLines.find(
                                        (o) => o.endsWith('.cmd') || o.endsWith('.exe')
                                    ) || outLines[0];
                                res = await this.doRun(`"${runCmd}" ${argLine}`);
                            }
                        }
                    } else {
                        res = await this.doRun(`/usr/local/bin/${file} ${argLine}`);
                        if (res === ENOENT) {
                            res = await this.doRun(`/usr/bin/${file} ${argLine}`);
                        }
                        if (res === ENOENT) {
                            const whichOut = await this.doRun(`which ${file}`, false);
                            if (typeof whichOut === 'string') {
                                res = await this.doRun(`"${whichOut}" ${argLine}`);
                            }
                        }
                    }
                }
                if (typeof res === 'number') {
                    if (res === ENOENT && !this.options.log) {
                        // not logged in this.doRun()
                        this.options.logger.error(`Command not found: ${cmd}`);
                    }
                    return '';
                } else {
                    return res;
                }
            } else {
                return '';
            }
        }
    }

    get isWindows(): boolean {
        return process.platform === 'win32';
    }

    /**
     * Separates command line into exec file and args
     */
    private parseArgs(cmd: string): [string, string[]] {
        let command = cmd.trim();
        let args = '';
        const sp = command.indexOf(' ');
        if (sp > 0) {
            if (command.startsWith('"')) {
                const endq = command.indexOf('" ', 1);
                args = command.substring(endq + 2);
                command = command.substring(1, endq);
            } else {
                args = command.substring(sp + 1);
                command = command.substring(0, sp);
            }
        }
        return [
            command,
            args.split(/\s+/).map((arg) => {
                let a = arg.trim();
                if (a.startsWith('"') && a.endsWith('"')) {
                    a = a.substring(1, a.length - 1);
                }
                return a;
            })
        ];
    }
}
