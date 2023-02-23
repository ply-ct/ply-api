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
            repoDir: '.github-repos'
        }
    };

    it('loads ply requests from cloned', async () => {
        const plyData = new PlyData(apiConfig);

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal(`${apiConfig.github.repoDir}/ply-demo/test`);

        const plyRequests = await plyData.getPlyRequests();
        console.log('PLY REQUESTS: ' + JSON.stringify(plyRequests, null, 2));
    });

    it('loads ply flows from cloned', async () => {
        const plyData = new PlyData(apiConfig);

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal(`${apiConfig.github.repoDir}/ply-demo/test`);

        const plyFlows = await plyData.getPlyFlows();
        console.log('PLY FLOWS: ' + JSON.stringify(plyFlows, null, 2));
    });

    it('loads ply cases from cloned', async () => {
        const plyData = new PlyData(apiConfig);

        const plyBase = await plyData.getPlyBase();
        expect(plyBase).to.be.equal(`${apiConfig.github.repoDir}/ply-demo/test`);

        const plyCases = await plyData.getPlyCases();
        console.log('PLY CASES: ' + JSON.stringify(plyCases, null, 2));
    });
});
