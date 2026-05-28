/**
 * Возвращает карту для резолвинга коротких имён модулей
 * @author Кудрявцев И.С.
 * @param reactVersion Версия реакта
 */
export default function getModuleResolution(reactVersion: number): Map<string, string[]> {
    const reactRoot = 'React/third-party';
    const cdnName = 'cdn/';
    const useExternalNameSpace = `use-sync-external-store/use-sync-external-store`;
    const map = {
        tslib: 'Typescript/tslib',

        text: 'RequireJsLoader/plugins/text',
        'native-css': 'RequireJsLoader/plugins/native-css',

        // TODO Юзает биллинг, убрать не можем.
        bootup: 'WS.Core/res/js/bootup',
        'bootup-min': 'WS.Core/res/js/bootup-min',
        'old-bootup': 'WS.Core/res/js/old-bootup',

        // React
        react: `${reactRoot}/v${reactVersion}/react/react`,
        'react/jsx-dev-runtime': `${reactRoot}/v${reactVersion}/react/jsx-dev-runtime/react-jsx-dev-runtime`,
        'react/jsx-runtime': `${reactRoot}/v${reactVersion}/react/jsx-runtime/react-jsx-runtime`,
        'react/react-server': `${reactRoot}/v${reactVersion}/react/react-server`,
        'react-compiler-runtime': `${reactRoot}/v${reactVersion}/react/react-compiler-runtime`,

        // React DOM
        'react-dom': `${reactRoot}/v${reactVersion}/react-dom/react-dom`,
        'react-dom/client': `${reactRoot}/v${reactVersion}/react-dom/client/react-dom-client`,
        'react-dom/server': `${reactRoot}/v${reactVersion}/react-dom/server/react-dom-server-legacy.browser`,
        'react-dom/test-utils': `${reactRoot}/v${reactVersion}/react-dom/test-utils/react-dom-test-utils`,
        'react-dom/testing': 'v17/react-dom/testing/react-dom-testing',
        'react-dom/profiling': `${reactRoot}/v${reactVersion}/react-dom/react-dom-profiling`,

        // React Test Renderer
        'react-test-renderer': 'v17/react-test-renderer/react-test-renderer',

        // React Reconciler
        'react-reconciler': `${reactRoot}/v${reactVersion}/react-reconciler/react-reconciler`,

        // React Is, Cache, Refresh, Server
        'react-is': `${reactRoot}/v${reactVersion}/react-is/react-is`,
        'react-cache': `${reactRoot}/v${reactVersion}/react-cache/react-cache`,
        'react-refresh/babel': `${reactRoot}/v19/react-refresh/react-refresh-babel`,
        'react-refresh/runtime': `${reactRoot}/v${reactVersion}/react-refresh/react-refresh-runtime`,
        'react-server': `${reactRoot}/v${reactVersion}/react-server/react-server`,

        // Scheduler
        'scheduler-react': `${reactRoot}/v${reactVersion}/scheduler/scheduler`,
        'scheduler-react/unstable_mock': `${reactRoot}/v${reactVersion}/scheduler/scheduler-unstable_mock`,
        'scheduler-react/unstable_post_task': `${reactRoot}/v${reactVersion}/scheduler/scheduler-unstable_post_task`,
        'scheduler-react/native': 'v19/scheduler/scheduler.native',

        scheduler: `${reactRoot}/v${reactVersion}/scheduler/scheduler`,
        'scheduler/unstable_mock': `${reactRoot}/v${reactVersion}/scheduler/scheduler-unstable_mock`,
        'scheduler/unstable_post_task': `${reactRoot}/v${reactVersion}/scheduler/scheduler-unstable_post_task`,
        'scheduler/native': 'v19/scheduler/scheduler.native',

        // use-subscription, use-sync-external-store
        'use-subscription': `${reactRoot}/v${reactVersion}/use-subscription/use-subscription`,
        'use-sync-external-store': `${reactRoot}/v${reactVersion}/${useExternalNameSpace}`,
        'use-sync-external-store/shim': `${reactRoot}/v${reactVersion}/${useExternalNameSpace}-shim`,
        'use-sync-external-store/shim/with-selector': `${reactRoot}/v${reactVersion}/${useExternalNameSpace}-shim-with-selector`,
        'use-sync-external-store/with-selector': `${reactRoot}/v${reactVersion}/${useExternalNameSpace}-with-selector`,
        'use-sync-external-store/shim/index.native': `${reactRoot}/v${reactVersion}/${useExternalNameSpace}-shim.native`,

        clsx: 'Clsx/third-party/clsx',

        // pixi libraries
        pixi: `${cdnName}PixiJS/6.5.10-p3/pixi.min.js`,
        'pixi-react': `${cdnName}PixiReact/6.8.0-p2/pixi-react.min.js`,
        pixi8: `${cdnName}PixiJS/8.7.2-p1/pixi.min.js`,
        'pixi-react7': `${cdnName}PixiReact/7.1.3-p1/pixi-react.min.js`,
        'pixi-react8': `${cdnName}PixiReact/8.0.4-p1/pixi-react.min.js`,

        // jQuery must die
        jquery: `${cdnName}JQuery/jquery/3.3.1/jquery-min.js`,
    };
    const result = new Map();

    for (const [defineName, path] of Object.entries(map)) {
        result.set(defineName, [path.split('/')[0], path]);
    }

    return result;
}
