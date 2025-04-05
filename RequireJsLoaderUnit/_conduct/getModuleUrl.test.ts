import getModuleUrl from 'RequireJsLoader/_conduct/getModuleUrl';
import { IWsConfig, IPatchedGlobal } from 'RequireJsLoader/wasaby';
import { IRequireExt } from 'RequireJsLoader/requireTypes';

const originalWsConfig = (globalThis as unknown as IPatchedGlobal).wsConfig;

describe('RequireJsLoader/_conduct/getModuleUrl', () => {
    const defaultContext = (requirejs as IRequireExt).s.contexts._;
    const originalConfig = { ...defaultContext.config };
    const originalNameToUrl = defaultContext.nameToUrl;
    const defaultPaths = { ...defaultContext.config.paths };

    let wsConfig: IWsConfig;

    beforeEach(() => {
        wsConfig = (globalThis as unknown as IPatchedGlobal).wsConfig = {
            ...originalWsConfig,
        };
        defaultContext.config.paths = { ...defaultPaths };
    });

    afterEach(() => {
        (globalThis as unknown as IPatchedGlobal).wsConfig = originalWsConfig;

        Object.assign(defaultContext.config, originalConfig);
        defaultContext.nameToUrl = originalNameToUrl;
    });

    it('should return valid module URL', () => {
        expect(getModuleUrl('RequireJsLoader/conduct')).toStrictEqual(
            '/RequireJsLoader/conduct.js'
        );
    });

    it('should return valid module URL with its own extension', () => {
        expect(getModuleUrl('RequireJsLoader/picture.svg')).toStrictEqual(
            '/RequireJsLoader/picture.svg'
        );

        expect(getModuleUrl('WS.Core/res/js/revive-controls')).toStrictEqual(
            '/WS.Core/res/js/revive-controls.js'
        );

        expect(getModuleUrl('Types/lang/ru/ru.json')).toStrictEqual('/Types/lang/ru/ru.json.js');

        expect(getModuleUrl('Core/Abstract.compatible')).toStrictEqual(
            '/WS.Core/core/Abstract.compatible.js'
        );
    });

    it('should return valid URL for css! plugin', () => {
        expect(getModuleUrl('css!RequireJsLoader/conduct')).toStrictEqual(
            '/RequireJsLoader/conduct.css'
        );

        expect(getModuleUrl('css!themes/default')).toStrictEqual('/ThemesModule/default.css');

        // create an environment of a local demo stand,
        // specifically without appRoot and APP_PATH
        wsConfig.APP_PATH = '';
        defaultContext.config.baseUrl = '';

        expect(getModuleUrl('css!themes/default')).toStrictEqual('/ThemesModule/default.css');
    });

    it('should return valid URL for css! plugin for auth applications with virtual service', () => {
        expect(getModuleUrl('css!themes/default')).toStrictEqual('/ThemesModule/default.css');

        // create an environment of an auth application with virtual service,
        // it must have appRoot and custom themes path(which contains in its resources
        // url of service with themes inside along with root themes), e.g.
        // e.g.
        // /auth/resources/themes/ - root themes path
        // /auth/resources/auth-online/ - themes path for /auth-online/ virtual service
        // /auth/resources/auth-retail/ - themes path for /auth-retail/ virtual service
        wsConfig.appRoot = '/auth/';
        wsConfig.resourceRoot = '/auth/resources/';
        defaultContext.config.baseUrl = '/auth/';
        // @ts-ignore
        defaultContext.config.paths.themes = '/auth/resources/auth/ThemesModule';

        expect(getModuleUrl('css!themes/default')).toStrictEqual(
            '/auth/resources/auth/ThemesModule/default.css'
        );
    });

    it('should return url without static service url for root meta', () => {
        wsConfig.appRoot = '/';
        wsConfig.wsRoot = '/static/resources/WS.Core';
        wsConfig.resourceRoot = '/static/resources/';
        wsConfig.metaRoot = '/resources/';

        expect(getModuleUrl('RequireJsLoader/conduct')).toStrictEqual(
            '/static/RequireJsLoader/conduct.js'
        );

        expect(getModuleUrl('router')).toStrictEqual('/resources/router.js');
    });

    it('should return valid URL for third-party libraries(e.g. /cdn/)', () => {
        expect(getModuleUrl('/cdn/library/production.js')).toStrictEqual(
            '/cdn/library/production.js'
        );

        expect(getModuleUrl('browser!/cdn/library/production.js')).toStrictEqual(
            '/cdn/library/production.js'
        );

        expect(getModuleUrl('browser!/cdn/library/production')).toStrictEqual(
            '/cdn/library/production.js'
        );

        expect(getModuleUrl('css!/cdn/library/production')).toStrictEqual(
            '/cdn/library/production.css'
        );

        expect(getModuleUrl('css!/cdn/library/production.css')).toStrictEqual(
            '/cdn/library/production.css'
        );

        expect(getModuleUrl('/rtpack/current-package.js')).toStrictEqual(
            '/rtpack/current-package.js'
        );

        expect(getModuleUrl('/demo_src/library/production.js')).toStrictEqual(
            '/demo_src/library/production.js'
        );
    });

    it('should cut off application root on server', () => {
        defaultContext.config.baseUrl = '/path/to/app/root/';
        wsConfig.APP_PATH = '/path/to/app/root/';

        expect(getModuleUrl('RequireJsLoader/conduct')).toStrictEqual(
            '/RequireJsLoader/conduct.js'
        );
    });

    it('should cut off application path and add application root on server', () => {
        wsConfig.APP_PATH = '/path/to/app/root/';
        wsConfig.appRoot = '/current-service/';
        wsConfig.resourceRoot = '/someStatic/';

        expect(getModuleUrl('/path/to/app/root/RequireJsLoader/conduct')).toStrictEqual(
            '/someStatic/RequireJsLoader/conduct.js'
        );

        wsConfig.APP_PATH = '/path/to/app/root';
        wsConfig.resourceRoot = '/someStatic/resources/';

        expect(getModuleUrl('/path/to/app/root/RequireJsLoader/conduct')).toStrictEqual(
            '/someStatic/RequireJsLoader/conduct.js'
        );
    });

    it('should cut off application path and version header and add application root on server', () => {
        wsConfig.APP_PATH = '/path/to/app/root/';
        wsConfig.appRoot = '/current-service/';
        wsConfig.resourceRoot = '/someStatic/';

        expect(
            getModuleUrl('/path/to/app/root/RequireJsLoader/conduct.js?x_module=test')
        ).toStrictEqual('/someStatic/RequireJsLoader/conduct.js');

        wsConfig.resourceRoot = '/someStatic/resources/';

        expect(
            getModuleUrl('/path/to/app/root/RequireJsLoader/conduct.js?x_module=test')
        ).toStrictEqual('/someStatic/RequireJsLoader/conduct.js');
    });

    it("shouldn't cut off application root on client", () => {
        defaultContext.config.baseUrl = '/path/to/app/root/assets/';
        wsConfig.APP_PATH = '/path/to/app/root/';
        wsConfig.IS_SERVER_SCRIPT = false;

        expect(getModuleUrl('RequireJsLoader/conduct')).toStrictEqual(
            '/path/to/app/root/assets/RequireJsLoader/conduct.js'
        );
    });

    it('should cut off application root in builder environment', () => {
        defaultContext.config.baseUrl = '/path/to/app/root/';
        wsConfig.APP_PATH = '/path/to/app/root/';
        wsConfig.IS_SERVER_SCRIPT = false;
        wsConfig.IS_BUILDER = true;
        wsConfig.RESOURCES_PATH = '/';

        expect(getModuleUrl('css!themes/default')).toStrictEqual('/ThemesModule/default.css');

        wsConfig.RESOURCES_PATH = '/resources/';

        expect(getModuleUrl('css!themes/default')).toStrictEqual(
            '/resources/ThemesModule/default.css'
        );
    });

    it('should return URL with domain name', () => {
        wsConfig.staticDomains = { domains: ['foo.bar'] };

        expect(getModuleUrl('RequireJsLoader/conduct')).toStrictEqual(
            '//foo.bar/RequireJsLoader/conduct.js'
        );
    });

    it("shouldn't return URL with domain name even though domain is selected if this is disabled by user", () => {
        wsConfig.staticDomains = { domains: ['foo.bar'] };

        expect(getModuleUrl('RequireJsLoader/conduct', undefined, undefined, true)).toStrictEqual(
            '/RequireJsLoader/conduct.js'
        );
    });

    it('should return URL with domain name', () => {
        defaultContext.nameToUrl = () => '//foo.bar/RequireJsLoader/conduct.js';
        wsConfig.APP_PATH = '/';

        const result = getModuleUrl('RequireJsLoader/conduct');

        expect(result).toStrictEqual('//foo.bar/RequireJsLoader/conduct.js');
    });
});
