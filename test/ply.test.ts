import * as assert from 'assert';
import { expect } from 'chai';
import { PlyData } from '../src/data/ply';
import { FileSystemData } from '../src/data/files';
import { ApiConfig } from '../src/model/api';

describe('ply', () => {
    const apiConfig: ApiConfig = {
        name: 'ply-demo',
        github: {
            url: 'https://github.com/ply-ct/ply-demo',
            user: 'donaldoakes',
            token: process.env.GITHUB_TOKEN,
            verbose: true
        }
    };

    it('loads ply requests through github api', async () => {
        const fileData = new FileSystemData(apiConfig);
        const plyData = new PlyData(await fileData.getFileAccess());

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
        const reposDir = '.git-repos';
        const fileData = new FileSystemData({
            ...apiConfig,
            github: { ...apiConfig.github, reposDir }
        });
        const plyData = new PlyData(await fileData.getFileAccess(), {
            repoPath: `${reposDir}/${apiConfig.name}`,
            suiteSource: true
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
        const fileData = new FileSystemData({ ...apiConfig, dir: '.git-repos/ply-demo' });
        const plyData = new PlyData(await fileData.getFileAccess(), { dir: '.git-repos/ply-demo' });

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
        const fileData = new FileSystemData(apiConfig);
        const plyData = new PlyData(await fileData.getFileAccess(), { suiteSource: true });

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
        const reposDir = '.git-repos';
        const fileData = new FileSystemData({
            ...apiConfig,
            github: { ...apiConfig.github, reposDir }
        });
        const plyData = new PlyData(await fileData.getFileAccess(), {
            repoPath: `${reposDir}/${apiConfig.name}`,
            suiteSource: true
        });

        const expectedResults = await plyData.getApiExpectedResults();

        const moviesApiResults = expectedResults.filter(
            (er) => er.path === 'test/results/expected/flows/movies-api.yaml'
        );

        assert.ok(moviesApiResults);
        expect(moviesApiResults.length).to.be.equal(5);
    });

    it('loads expected results from github', async () => {
        const fileData = new FileSystemData(apiConfig);
        const plyData = new PlyData(await fileData.getFileAccess(), { suiteSource: true });

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const resultsPath = 'test/results/expected/flows/movies-api.yaml';
        const results = await plyData.getExpectedResults(resultsPath);
        assert.ok(results);
        expect(results.path).to.be.equal(resultsPath);
    });
});
