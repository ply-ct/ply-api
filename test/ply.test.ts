import * as assert from 'assert';
import { expect } from 'chai';
import { PlyData, PlyDataOptions } from '../src/data/ply';
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

    it('loads ply flows from dir', async () => {
        const fileData = new FileSystemData(apiConfig);
        const plyData = new PlyData(await fileData.getFileAccess());

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal('test');

        const plyFlows = await plyData.getPlyFlows();
        console.log('PLY FLOWS: ' + JSON.stringify(plyFlows, null, 2));
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
});
