import * as process from 'process';
import * as path from 'path';
import { promisify } from 'util';
import {
    execFile as cpExecFile,
    PromiseWithChild,
    ExecOptions as CpExecOptions
} from 'child_process';
import { ExecOptions, Executor } from '../model/exec';
import { lines } from './content';

const ENOENT = 127;

export class CommandExecutor implements Executor {
    private defaultOpts: ExecOptions = {
        cwd: '.',
        logger: console
    };

    private execFile: {
        (command: string, args: string[], options?: CpExecOptions): PromiseWithChild<{
            stdout: string;
            stderr: string;
        }>;
    };

    constructor() {
        this.execFile = promisify(cpExecFile);
    }

    async exec(cmd: string, options: ExecOptions): Promise<string> {
        const opts: ExecOptions = { ...this.defaultOpts, ...(options || {}) };
        const res = await this.doRun(cmd, opts);
        return '' + res;
    }

    private async doRun(
        cmd: string,
        options: ExecOptions,
        logStdErr = true
    ): Promise<string | number> {
        const before = new Date().getTime();
        try {
            let msg = options.message || `Running: '${cmd}'`;
            if (options.cwd) msg += ` in directory ${options.cwd}`;
            options.logger.log(`${msg}`);
            const [file, args] = this.parseArgs(cmd);
            const { stdout, stderr } = await this.execFile(file, args, options);
            if (logStdErr && stderr) options.logger.error(`  ${stderr}`);
            if (options.timed) {
                options.logger.log(`Exec completed in ${new Date().getTime() - before} ms`);
            }
            return stdout;
        } catch (err: any) {
            if (options.timed) {
                options.logger.log(`Exec errored in ${new Date().getTime() - before} ms`);
            }
            if (err.code === 'ENOENT') {
                options.logger.error(`Command not found: ${cmd}`);
                return ENOENT;
            } else {
                if (logStdErr) options.logger.error(err);
                return -1;
            }
        }
    }

    async run(cmd: string, options: ExecOptions, retry?: boolean) {
        let res = await this.doRun(cmd, options, !retry);
        if (typeof res === 'string') {
            return res;
        } else {
            if (res === ENOENT) {
                const [file, args] = this.parseArgs(cmd);
                const argLine = args.join(' ');
                if (retry === undefined) retry = !path.isAbsolute(file);
                if (retry) {
                    if (this.isWindows) {
                        const winBase = (options as any).winBase || '';
                        if (winBase) {
                            res = await this.doRun(
                                `"C:\\Program Files\\${winBase}\\${file}" ${argLine}`,
                                options
                            );
                        }
                        if (res === ENOENT || !winBase) {
                            const whereOut = await this.doRun(`where ${file}`, options, false);
                            if (typeof whereOut === 'string') {
                                const outLines = lines(whereOut.trim());
                                const runCmd =
                                    outLines.find(
                                        (o) => o.endsWith('.cmd') || o.endsWith('.exe')
                                    ) || outLines[0];
                                res = await this.doRun(`"${runCmd}" ${argLine}`, options);
                            }
                        }
                    } else {
                        res = await this.doRun(`/usr/local/bin/${file} ${argLine}`, options);
                        if (res === ENOENT) {
                            res = await this.doRun(`/usr/bin/${file} ${argLine}`, options);
                        }
                        if (res === ENOENT) {
                            const whichOut = await this.doRun(`which ${file}`, options, false);
                            if (typeof whichOut === 'string') {
                                res = await this.doRun(`"${whichOut}" ${argLine}`, options);
                            }
                        }
                    }
                }
                if (typeof res === 'number') {
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
