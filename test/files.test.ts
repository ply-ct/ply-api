import { expect } from 'chai';
import { FileSystemAccess } from '../src/util/files';

describe('files', () => {
    const files = new FileSystemAccess('.');

    it('lists files', async () => {
        const tsFiles = await files.listFiles('src', { recursive: true, patterns: ['**/*.ts'] });
        expect(tsFiles).to.include('src/data/files.ts');
    });
});
