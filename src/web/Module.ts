import RequireError from '../main/RequireError';
import { availableLoaders, IModuleInfo, IRequire } from '../main/BaseRequire';
import BaseModule, { TLoader, NO_EXPORTS } from '../main/Module';
import { requireCallback } from 'RequireJsLoader/requireTypes';

import wml from './loaders/wml';
import js from './loaders/js';
import tmpl from './loaders/tmpl';
import css from './loaders/css';
import i18n from './loaders/i18n';
import json from './loaders/json';
import text from './loaders/text';
import html from './loaders/html';
import bundleLoader from './loaders/bundle';

const loaders: Record<availableLoaders, TLoader<Promise<void>, Module>> = {
    wml,
    js,
    tmpl,
    css,
    i18n,
    json,
    text,
    html,
};

export default class Module extends BaseModule {
    protected loader: IRequire<Module>;

    constructor(name: string, loader: IRequire<Module>) {
        super(name);

        this.loader = loader;
    }

    private _createDefinitionPromise(timeout: number): {
        promise: Promise<void>;
        clear: () => void;
    } {
        const resetController = new AbortController();
        let signal;
        let timeoutId: number;
        let clear;

        if (typeof AbortSignal.timeout === 'function') {
            signal = AbortSignal.timeout(timeout);

            clear = () => {
                resetController.abort();
                this.onDefine = null;
            };
        } else {
            const controller = new AbortController();

            signal = controller.signal;

            timeoutId = setTimeout(() => {
                controller.abort();
            }, timeout);

            clear = () => {
                clearTimeout(timeoutId);
                resetController.abort();
                this.onDefine = null;
            };
        }

        const promise: Promise<void> = new Promise((resolve, reject) => {
            signal.addEventListener(
                'abort',
                () => {
                    reject(
                        new RequireError(
                            `Module "${this.name}" by url "${this.url}" did not load within ${timeout} ms.`
                        )
                    );
                },
                { signal: resetController.signal }
            );

            this.onDefine = resolve;
        });

        return {
            promise,
            clear,
        };
    }

    private async _createDownLoadPromise(timeout: number): Promise<void> {
        const { promise, clear } = this._createDefinitionPromise(timeout);

        try {
            const moduleInfo =
                this.loader.modulesInfo.get(this.rootDir) ||
                (this.loader.modulesInfo.get('$default$') as IModuleInfo);

            if (moduleInfo.packageMap) {
                await bundleLoader(this, moduleInfo, this.loader, loaders[this.extension]);
            } else {
                await loaders[this.extension](this, moduleInfo, this.loader);
            }

            await promise;
        } catch (err) {
            if (RequireError.isReqiureError(err)) {
                throw err;
            } else {
                throw new RequireError(
                    `Failed to load module "${this.name}" file by url "${this.url}".`,
                    {
                        cause: err as Error,
                        type: 'load',
                    }
                );
            }
        } finally {
            clear();
        }
    }

    load(timeout: number): Promise<void> {
        if (!this.loading) {
            this.loading = this._createDownLoadPromise(timeout);
        }

        return this.loading;
    }

    async getExports(): Promise<unknown> {
        if (this.exports !== NO_EXPORTS) {
            return this.exports;
        }

        try {
            if ((this.deps as string[]).length === 0) {
                this.exports = this.executeCallback();
            } else {
                // Необходма для того чтобы require смог разрещить относительные пути.
                this.loader.context = this;

                const depExports = await this.loader.require(this.deps as string[]);

                // В этой точке конетекст может быть перебить зависимостями, поэтому выставялем его снова.
                // Внутри колбека могут вызывать синхроный require с относительным именем.
                this.loader.context = this;

                this.exports = this.executeCallback(depExports);

                this.loader.context = null;

                if (!this.exports) {
                    this.exports = this.extractExports(depExports);
                }
            }

            if (this.extension === 'js' && this.exports) {
                this.injectModuleName(this.exports, this.name);
            }

            return this.exports;
        } catch (err) {
            if (RequireError.isReqiureError(err)) {
                throw err;
            }

            throw new RequireError(
                `Failed to execute  callback function for module "${this.name}" loaded by url "${this.url}".`,
                {
                    cause: err as Error,
                    type: 'Executing callback',
                }
            );
        }
    }

    executeCallback(depsExports: unknown[] = []): unknown {
        // В этой точке конетекст может быть перебить зависимостями, поэтому выставялем его снова.
        // Внутри колбека могут вызывать синхроный require с относительным именем.
        this.loader.context = this;

        const result = (this.callback as requireCallback)(...depsExports);

        this.loader.context = null;

        return result;
    }
}
