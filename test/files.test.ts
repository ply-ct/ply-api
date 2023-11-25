import * as assert from 'assert';
import { expect } from 'chai';
import { FileSystemAccess } from '../src/data/files';
import { GitHubAccess } from '../src/data/github';
import { GitHubOptions } from '../src/model/github';
import { CommandExecutor } from '../src/util/exec';
import { PlyAccess } from '../src/data/ply';

describe('files', () => {
    const gitHubOptions: GitHubOptions = {
        url: 'https://github.com/ply-ct/ply-demo',
        user: 'donaldoakes',
        token: process.env.GH_TOKEN,
        verbose: true,
        logger: console
    };

    it('lists files', async () => {
        const files = new FileSystemAccess('.');
        const tsFiles = await files.listFiles('src', { recursive: true, patterns: ['**/*.ts'] });
        expect(tsFiles).to.include('src/data/files.ts');
    });

    it('loads test files from cloned', async () => {
        const fileAccess = new FileSystemAccess('.git-repos/ply-demo');
        const gitHubAccess = new GitHubAccess({
            ...gitHubOptions,
            localRepository: {
                dir: '.git-repos/ply-demo',
                fileSystem: fileAccess,
                executor: new CommandExecutor()
            }
        });
        await gitHubAccess.init();
        const plyData = new PlyAccess(gitHubAccess, {
            suiteSource: true,
            logger: console
        });

        const testFiles = await plyData.getTestFiles();

        expect(testFiles.ply.base).to.be.equal('test');

        const flowFile = testFiles.files.find((tf) => tf.path === 'flows/movies-api.ply.flow');
        assert.ok(flowFile);
        expect(flowFile.type).to.be.equals('flow');
        expect(flowFile.tests.length).to.be.equal(10);
        expect(flowFile.tests[1].id).to.be.equal('f1-s5');
        expect(flowFile.tests[1].name).to.be.equal('Delete Movie');

        const reqSuiteFile = testFiles.files.find(
            (tf) => tf.path === 'requests/movies-api.ply.yaml'
        );
        assert.ok(reqSuiteFile);
        expect(reqSuiteFile.type).to.be.equals('request');
        expect(reqSuiteFile.tests.length).to.be.equal(5);
        expect(reqSuiteFile.tests[1].id).to.be.equal('updateMovie');
        expect(reqSuiteFile.tests[1].name).to.be.equal('updateMovie');
        expect(reqSuiteFile.tests[1].__start).to.be.equal(45);
        expect(reqSuiteFile.tests[1].__end).to.be.equal(54);

        const reqFile = testFiles.files.find((tf) => tf.path === 'requests/create-movie.ply');
        assert.ok(reqFile);
        expect(reqFile.type).to.be.equals('request');
        expect(reqFile.tests.length).to.be.equal(1);
        expect(reqFile.tests[0].id).to.be.equal('Create Movie');
        expect(reqFile.tests[0].name).to.be.equal('Create Movie');
        expect(reqFile.tests[0].__start).to.be.equal(0);
        expect(reqFile.tests[0].__end).to.be.equal(41);
    });
});
