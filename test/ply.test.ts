import * as assert from 'assert';
import { expect } from 'chai';
import { PlyAccess } from '../src/data/ply';
import { GitHubAccess } from '../src/data/github';
import { GitHubOptions } from '../src/model/github';
import { FileSystemAccess } from '../src/data/files';
import { CommandExecutor } from '../src/util/exec';

describe('ply', () => {
    const gitHubOptions: GitHubOptions = {
        url: 'https://github.com/ply-ct/ply-demo',
        user: 'donaldoakes',
        token: process.env.GH_TOKEN,
        verbose: true,
        logger: console
    };

    it('loads ply requests through github api', async () => {
        const gitHubAccess = new GitHubAccess(gitHubOptions);
        const plyData = new PlyAccess(gitHubAccess);

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const plyRequests = await plyData.getPlyRequests();

        const createMovie = plyRequests.find(
            (req) => req.path === 'test/requests/create-movie.ply'
        );
        assert.ok(createMovie);
        expect(createMovie.requests.length).to.be.equal(1);
        expect(createMovie.requests[0].url).to.be.equal('${baseUrl}/movies');
        expect(createMovie.requests[0].method).to.be.equal('POST');
        expect(createMovie.requests[0].body).to.be.not.undefined;
    });

    it('loads request suite from cloned', async () => {
        const fileAccess = new FileSystemAccess('.git-repos/ply-demo');
        const gitHubAccess = new GitHubAccess({
            ...gitHubOptions,
            localRepository: {
                dir: '.git-repos/ply-demo',
                fileSystem: fileAccess,
                executor: new CommandExecutor()
            }
        });
        const plyData = new PlyAccess(gitHubAccess, {
            suiteSource: true,
            logger: console
        });

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const suitePath = 'test/requests/movie-queries.ply.yaml';
        const requestSuite = await plyData.getRequestSuite(suitePath);
        assert.ok(requestSuite);
        expect(requestSuite.name).to.be.equal('requests/movie-queries.ply.yaml');
        expect(requestSuite.path).to.be.equal(suitePath);
        expect(requestSuite.requests.length).to.be.equal(5);
    });

    /**
     * must have been cloned already (see above)
     */
    it('loads ply flows from dir', async () => {
        const fileAccess = new FileSystemAccess('.git-repos/ply-demo');
        const plyData = new PlyAccess(fileAccess, {
            dir: '.git-repos/ply-demo',
            logger: console
        });

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const plyFlows = await plyData.getPlyFlows();
        const getMoviesFlow = plyFlows.find((f) => f.name === 'flows/get-movies.ply.flow');
        assert.ok(getMoviesFlow);
        expect(getMoviesFlow.path).to.be.equal('test/flows/get-movies.ply.flow');
        assert.ok(getMoviesFlow.steps);
        expect(getMoviesFlow.steps[0].name).to.be.equal('Start');
        expect(getMoviesFlow.steps[0].path).to.be.equal('start');
    });

    it('loads flow through github api', async () => {
        const gitHubAccess = new GitHubAccess(gitHubOptions);
        const plyData = new PlyAccess(gitHubAccess, {
            suiteSource: true,
            logger: console
        });

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const flowPath = 'test/flows/movies-api.ply.flow';
        const plyFlow = await plyData.getPlyFlow(flowPath);
        assert.ok(plyFlow);
        expect(plyFlow.name).to.be.equal('flows/movies-api.ply.flow');
        expect(plyFlow.path).to.be.equal(flowPath);
        assert.ok(plyFlow.steps);
        expect(plyFlow.steps.length).to.be.equal(7);
        expect(plyFlow.steps[0].name).to.be.equal('Start');
        expect(plyFlow.steps[0].path).to.be.equal('start');
        assert.ok(plyFlow.subflows);
        expect(plyFlow.subflows.length).to.be.equal(1);
    });

    it('loads api expected results from cloned', async () => {
        const fileAccess = new FileSystemAccess('.git-repos/ply-demo');
        const gitHubAccess = new GitHubAccess({
            ...gitHubOptions,
            localRepository: {
                dir: '.git-repos/ply-demo',
                fileSystem: fileAccess,
                executor: new CommandExecutor()
            }
        });
        const plyData = new PlyAccess(gitHubAccess, {
            suiteSource: true,
            logger: console
        });

        const expectedResults = await plyData.getApiExpectedResults();

        const moviesApiResults = expectedResults.filter(
            (er) => er.path === 'test/results/expected/flows/movies-api.yaml'
        );

        assert.ok(moviesApiResults);
        expect(moviesApiResults.length).to.be.equal(5);
    });

    it('loads expected results from github api', async () => {
        const gitHubAccess = new GitHubAccess(gitHubOptions);
        const plyData = new PlyAccess(gitHubAccess);

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const resultsPath = 'test/results/expected/flows/movies-api.yaml';
        const results = await plyData.getExpectedResults(resultsPath);
        assert.ok(results);
        expect(results.path).to.be.equal(resultsPath);
    });

    it('loads values through github api', async () => {
        const fileAccess = new FileSystemAccess('.git-repos/ply-demo');
        const plyData = new PlyAccess(fileAccess, {
            dir: '.git-repos/ply-demo',
            logger: console
        });

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const valuesHolders = await plyData.getFileValuesHolders();
        expect(valuesHolders.length).to.be.equal(2);
        expect(valuesHolders[0].location?.path).to.be.equal('test/values/global.json');
        const vals0 = valuesHolders[0].values as any;
        expect(vals0.rating).to.be.equal(5);
        expect(valuesHolders[1].location?.path).to.be.equal('test/values/ply-ct.json');
        const vals1 = valuesHolders[1].values as any;
        expect(vals1.baseUrl).to.be.equal('https://ply-ct.org');
    });

    /**
     * must have been cloned already (see above)
     */
    it('loads values from dir', async () => {
        const gitHubAccess = new GitHubAccess(gitHubOptions);
        const plyData = new PlyAccess(gitHubAccess, {
            suiteSource: true,
            logger: console
        });

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const valuesHolders = await plyData.getFileValuesHolders();
        expect(valuesHolders.length).to.be.equal(2);
        expect(valuesHolders[0].location?.path).to.be.equal('test/values/global.json');
        const vals0 = valuesHolders[0].values as any;
        expect(vals0.year).to.be.equal(1931);
        expect(valuesHolders[1].location?.path).to.be.equal('test/values/ply-ct.json');
        const vals1 = valuesHolders[1].values as any;
        expect(vals1.baseUrl).to.be.equal('https://ply-ct.org');
    });
});
