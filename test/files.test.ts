import * as assert from 'assert';
import { expect } from 'chai';
import { FileSystemAccess } from '../src/util/files';

describe('files', () => {
    const files = new FileSystemAccess('.');

    it('lists files', async () => {
        const tsFiles = await files.listFiles('src', { recursive: true, patterns: ['**/*.ts'] });
        console.log('FILES: ' + JSON.stringify(tsFiles, null, 2));
    });
});
