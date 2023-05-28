import { parse, ParseError, printParseErrorCode } from 'jsonc-parser';
import { Logger } from '../model/log';

export function parseJsonc(file: string, input: string, logger?: Logger): any {
    const errs: ParseError[] = [];
    const output = parse(input, errs);
    printErrors(file, errs, logger);
    return output;
}

function printErrors(file: string, errors: ParseError[], logger?: Logger) {
    if (errors.length > 0) {
        logger?.error(`jsonc-parser errors in ${file}:`);
        for (const err of errors) {
            const label = printParseErrorCode(err.error);
            logger?.error(` - ${label}:` + JSON.stringify(err));
        }
        logger?.log('');
    }
}
