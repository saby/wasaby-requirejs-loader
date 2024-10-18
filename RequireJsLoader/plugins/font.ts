import { IPluginLoadFunction } from '../requireTypes';
import { loadFont } from 'RequireJsLoader/conduct';

function logError(err: Error, onLoad: IPluginLoadFunction): void {
    // Ошибка загрузки шрифта не должна ронять построение страницы,
    // поэтому если есть консоль, плюнем в неё ошибкой, а в require отдадим false.
    if (typeof console === 'object') {
        // eslint-disable-next-line
        console.error(err);
    }

    onLoad(false);
}

export = {
    load(name: string, _require: Require, onLoad: IPluginLoadFunction) {
        const [nameFont, size] = name.split('?').reverse();

        loadFont(
            nameFont,
            size,
            () => {
                onLoad(true);
            },
            (err) => {
                logError(err, onLoad);
            }
        );
    },
};
