import { parse, ParseError, printParseErrorCode } from 'jsonc-parser';

export function parseJsonc(file: string, input: string): any {
    const errs: ParseError[] = [];
    const output = parse(input, errs);
    printErrors(file, errs);
    return output;
}

function printErrors(file: string, errors: ParseError[]) {
    if (errors.length > 0) {
        console.error(`jsonc-parser errors in ${file}:`);
        for (const err of errors) {
            const label = printParseErrorCode(err.error);
            console.error(` - ${label}:` + JSON.stringify(err));
        }
        console.log('');
    }
}
