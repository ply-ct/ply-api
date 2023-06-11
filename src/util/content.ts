import * as jsYaml from 'js-yaml';
import fetch from 'cross-fetch';
import { plyApiVersion } from '../versions';
import { Logger } from '../model/log';

export interface ContentOptions {
    token?: string;
    logger?: Logger;
}

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
