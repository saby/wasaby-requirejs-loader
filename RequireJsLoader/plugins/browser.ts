/// <amd-module name="browser" />
import {PluginCallback} from '../require.ext';

const browser = {
    load(name: string, require: Require, onLoad: PluginCallback): void {
        if (typeof window === 'undefined') {
            onLoad(null);
            return;
        }

        require([name], onLoad, (err: Error) => {
            onLoad.error(err);
        });
    }
};

export = browser;
