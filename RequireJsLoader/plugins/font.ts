import { IPluginLoadFunction } from '../require.ext';
import { loadFont } from 'RequireJsLoader/conduct';

export = {
    load(name: string, _require: Require, onLoad: IPluginLoadFunction) {
        loadFont(
            name,
            () => {
                onLoad(true);
            },
            onLoad.error
        );
    },
};
