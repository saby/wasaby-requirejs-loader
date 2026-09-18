/**
 * Серверный загрузчик для JS
 * @author Кудрявцев И.С.
 */
import { IRequire, DEFINE_MODULE } from '../../main/BaseRequire';
import type ServerRequire from '../../ServerRequire';
import RequireError from '../../main/RequireError';

declare function importScripts(url: string): void;

let load: (name: string, path: string, context: IRequire) => void;

if (typeof importScripts !== 'undefined') {
    load = (name, path, context): unknown => {
        importScripts(path);

        if (context.definedMap.has(name)) {
            return DEFINE_MODULE;
        }

        return null;
    };
} else {
    const nodeRequire = require;

    load = (name, path, context): unknown => {
        let result: unknown;

        try {
            result = nodeRequire(path);
        } catch (err) {
            try {
                // Если мы не смогли получить файл по вычисленому пути,
                // возможно это чисто node-ая зависимость, попробуем зарейкварить её по имени.
                result = nodeRequire(name);
            } catch (_e) {
                throw err;
            }
        }

        if (context.definedMap.has(name)) {
            return DEFINE_MODULE;
        }

        return result;
    };
}

/**
 * Загружает модули с именем ${ModuleName}
 * @param defineName
 * @param filePath
 * @param buildPath Функция для формирования пути до файла
 * @param context
 */
export default (defineName: string, filePath: string, context: ServerRequire): unknown => {
    const path = context.buildPath(filePath, 'js');

    try {
        return load(defineName, path, context);
    } catch (err) {
        throw new RequireError(
            `Failed to load JavaScript module "${defineName}" file by path "${path}".`,
            {
                cause: err as Error,
                type: 'load',
            }
        );
    }
};
