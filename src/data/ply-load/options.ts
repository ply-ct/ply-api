import { PlyDefaults, PlyOptions } from '../../model/options';
import { FileAccess } from '../../model/files';
import { PlyDataOptions } from '../../model/data';
import { loadContent } from '../../util/content';

export class OptionsLoader {
    constructor(private files: FileAccess, private options: PlyDataOptions) {}

    /**
     * TODO: skipped
     */
    async loadPlyOptions(plyConfig?: string): Promise<PlyOptions> {
        let plyOptions: PlyOptions = new PlyDefaults();
        let plyConfigFile: string | undefined;
        let plyConfigContents: string | undefined;
        if (plyConfig) {
            plyConfigFile = plyConfig;
            plyConfigContents = await this.files.readTextFile(plyConfigFile);
        } else {
            plyConfigFile = 'plyconfig.yaml';
            plyConfigContents = await this.files.readTextFile(plyConfigFile);
            if (!plyConfigContents) {
                plyConfigFile = 'plyconfig.json';
                plyConfigContents = await this.files.readTextFile(plyConfigFile);
            }
        }
        if (plyConfigContents) {
            this.options.logger.log(`Loading ply config from: ${plyConfigFile}`);
            const plyConfig = loadContent(plyConfigContents, plyConfigFile) as PlyOptions;
            plyOptions = { ...plyOptions, ...plyConfig };
        }
        return plyOptions;
    }
}
