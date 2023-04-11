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

        console.log('PLY REQUESTS: ' + JSON.stringify(plyRequests, null, 2));
    });

    it('loads ply cases from cloned', async () => {
        const reposDir = '.git-repos';
        const fileData = new FileSystemData({
            ...apiConfig,
            github: { ...apiConfig.github, reposDir }
        });
        const plyData = new PlyData(await fileData.getFileAccess(), {
            repoPath: `${reposDir}/${apiConfig.name}`
        });

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const plyCases = await plyData.getPlyCases();
        console.log('PLY CASES: ' + JSON.stringify(plyCases, null, 2));
    });

    /**
     * must have been cloned already
     */
    it('loads ply flows from dir', async () => {
        const fileData = new FileSystemData({ ...apiConfig, dir: '.git-repos/ply-demo' });
        const plyData = new PlyData(await fileData.getFileAccess(), { dir: '.git-repos/ply-demo' });

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const plyFlows = await plyData.getPlyFlows();
        console.log('PLY FLOWS: ' + JSON.stringify(plyFlows, null, 2));
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

        const requestSuite = await plyData.getRequestSuite('test/requests/movie-queries.ply.yaml');
        console.log('REQUEST SUITE: ' + JSON.stringify(requestSuite, null, 2));
    });

    it('loads flow through github api', async () => {
        const fileData = new FileSystemData(apiConfig);
        const plyData = new PlyData(await fileData.getFileAccess(), { suiteSource: true });

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const plyFlow = await plyData.getPlyFlow('test/flows/movies-api.ply.flow');
        console.log('PLY FLOW: ' + JSON.stringify(plyFlow, null, 2));
    });

    it('loads case suite from dir', async () => {
        const fileData = new FileSystemData({ ...apiConfig, dir: '.git-repos/ply-demo' });
        const plyData = new PlyData(await fileData.getFileAccess(), {
            dir: '.git-repos/ply-demo',
            suiteSource: true
        });

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const caseSuite = await plyData.getCaseSuite('test/cases/movieCrud.ply.ts');
        console.log('CASE SUITE: ' + JSON.stringify(caseSuite, null, 2));
    });
});
