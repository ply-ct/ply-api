import * as assert from 'assert';
import { expect } from 'chai';
import { PlyData } from '../src/data/ply';
import { ApiConfig } from '../src/model/api';

describe('ply', () => {
    const apiConfig: ApiConfig = {
        name: 'ply-demo',
        github: {
            url: 'https://github.com/ply-ct/ply-demo',
            user: 'donaldoakes',
            token: process.env.GITHUB_TOKEN,
            reposDir: '.github-repos'
        }
    };

    it('loads ply requests from cloned', async () => {
        const plyData = new PlyData(apiConfig);

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal(`${apiConfig.github.reposDir}/ply-demo/test`);

        const plyRequests = await plyData.getPlyRequests();

        const createMovie = plyRequests.find(
            (req) => req.path === '.github-repos/ply-demo/test/requests/create-movie.ply'
        );
        assert.ok(createMovie);
        expect(createMovie.requests.length).to.be.equal(1);
        expect(createMovie.requests[0].url).to.be.equal('${baseUrl}/movies');
        expect(createMovie.requests[0].method).to.be.equal('POST');
        expect(createMovie.requests[0].body).to.be.not.undefined;

        console.log('PLY REQUESTS: ' + JSON.stringify(plyRequests, null, 2));
    });

    it('loads ply flows from cloned', async () => {
        const plyData = new PlyData(apiConfig);

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal(`${apiConfig.github.reposDir}/ply-demo/test`);

        const plyFlows = await plyData.getPlyFlows();
        console.log('PLY FLOWS: ' + JSON.stringify(plyFlows, null, 2));
    });

    it('loads ply cases from cloned', async () => {
        const plyData = new PlyData(apiConfig);

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal(`${apiConfig.github.reposDir}/ply-demo/test`);

        const plyCases = await plyData.getPlyCases();
        console.log('PLY CASES: ' + JSON.stringify(plyCases, null, 2));
    });
});
