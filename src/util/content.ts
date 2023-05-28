import { promises as fs, existsSync as fileExists } from 'fs';
import * as jsYaml from 'js-yaml';
import fetch from 'cross-fetch';
import { plyApiVersion } from '../versions';
import { Logger } from '../model/log';

export interface ContentOptions {
    token?: string;
    logger?: Logger;
}

/**
 * Catches errors to provide a meaningful stack
 */
export const readFile = async (file: string): Promise<string> => {
    try {
        return await fs.readFile(file, { encoding: 'utf-8' });
    } catch (err: any) {
        throw new Error(`Error reading file '${file}': ${err.message}`);
    }
};

export const writeFile = async (file: string, content: string): Promise<void> => {
    try {
        return await fs.writeFile(file, content, { encoding: 'utf-8' });
    } catch (err: any) {
        throw new Error(`Error writing file '${file}': ${err.message}`);
    }
};

/**
 * Reads an object from json or yaml content
 */
export const loadContent = (content: string, filename?: string): object => {
    if (isJson(content, filename)) {
        try {
            return JSON.parse(content);
        } catch (err: any) {
            if (filename) {
                err.message = `JSON error parsing ${filename}: ${err.message}`;
            }
            throw err;
        }
    } else {
        return jsYaml.load(content, { filename }) as object;
    }
};

/**
 * Handles text only. Returns undefined on 404, throws for other non-ok.
 */
export const retrieveFromUrl = async (
    url: string,
    options?: ContentOptions
): Promise<string | undefined> => {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            ...(options?.token && { Authorization: `Bearer ${options.token}` }),
            'User-Agent': `ply-api ${plyApiVersion}`
        }
    });

    if (response.ok) {
        return await response.text();
    } else {
        options?.logger?.debug?.(
            `Retrieval ${response.status} response from ${url}:`,
            await response.text()
        );
        if (response.status !== 404) {
            throw new Error(`Bad Response -> ${url}: ${JSON.stringify(response.status)}`);
        }
    }
};

export const loadText = async (
    urlOrFile: string,
    options?: ContentOptions
): Promise<string | undefined> => {
    if (isUrl(urlOrFile)) {
        const opts = { ...(options || {}) };
        // token only sent to https
        if (!urlOrFile.startsWith('https://')) delete opts.token;
        return await retrieveFromUrl(urlOrFile, opts);
    } else if (fileExists(urlOrFile)) {
        return await readFile(urlOrFile);
    }
};

export const loadJsonOrYaml = async (
    urlOrFile: string,
    options?: ContentOptions
): Promise<object | undefined> => {
    const content = await loadText(urlOrFile, options);
    if (content) return loadContent(content, urlOrFile);
};

export const isUrl = (str: string): boolean => {
    return str.startsWith('https://') || str.startsWith('http://');
};

export const isJson = (content: string, filename?: string): boolean => {
    if (filename?.endsWith('.json')) return true;
    if (filename?.endsWith('.yaml') || filename?.endsWith('.yml')) return false;
    return content.startsWith('{');
};

export const lines = (str: string): string[] => {
    return str.split(/\r?\n/);
};
