import { TestFile, TestFolder } from '../model/test';

export class FlatTree {
    readonly root: TestFolder;
    private folders?: TestFolder[];

    constructor(readonly files: TestFile[]) {
        this.root = {
            path: ''
        };
        this.build();
    }

    private build() {
        for (const file of this.files) {
            const folder = this.getFolder(file.path);
            if (!folder.files) folder.files = [];
            folder.files.push(file);
        }
        this.folders?.sort((f1, f2) => {
            const segs1 = f1.path.split('/');
            const segs2 = f2.path.split('/');
            if (
                (segs1.length > segs2.length && f1.path.startsWith(`${f2.path}/`)) ||
                (segs2.length > segs1.length && f2.path.startsWith(`${f1.path}/`))
            ) {
                return segs1.length - segs2.length;
            } else {
                return f1.path.localeCompare(f2.path);
            }
        });
        this.root.folders = this.folders;
    }

    private getFolder(filepath: string): TestFolder {
        const lastSlash = filepath.lastIndexOf('/');
        if (lastSlash > 0) {
            if (!this.folders) this.folders = [];
            const folderPath = filepath.substring(0, lastSlash);
            let folder = this.folders.find((f) => f.path === folderPath);
            if (!folder) {
                folder = { path: folderPath };
                this.folders.push(folder);
            }
            return folder;
        } else {
            return this.root;
        }
    }
}
