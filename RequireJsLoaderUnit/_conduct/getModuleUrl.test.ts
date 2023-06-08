import { assert } from 'chai';
import getModuleUrl from 'RequireJsLoader/_conduct/getModuleUrl';
import { IWsConfig } from 'RequireJsLoader/wasaby';
import { IRequireExt } from '../../RequireJsLoader/require.ext';

const originalWsConfig = globalThis.wsConfig;

describe('RequireJsLoader/_conduct/getModuleUrl', () => {
    const defaultContext = (requirejs as IRequireExt).s.contexts._;
    const originalConfig = {...defaultContext.config};
    const originalNameToUrl = defaultContext.nameToUrl;
    const defaultPaths = Object.assign({}, defaultContext.config.paths);

    let wsConfig: IWsConfig;

    beforeEach(() => {
        wsConfig = globalThis.wsConfig = Object.assign({}, originalWsConfig);
        defaultContext.config.paths = Object.assign({}, defaultPaths);
    });

    afterEach(() => {
        globalThis.wsConfig = originalWsConfig;

        Object.assign(defaultContext.config, originalConfig);
        defaultContext.nameToUrl = originalNameToUrl;
    });

    it('should return valid module URL', () => {
        assert.equal(
            getModuleUrl('RequireJsLoader/conduct'),
            '/RequireJsLoader/conduct.js'
        );
    });

    it('should return valid module URL with its own extension', () => {
        assert.equal(
            getModuleUrl('RequireJsLoader/picture.svg'),
            '/RequireJsLoader/picture.svg'
        );
        assert.equal(
            getModuleUrl('WS.Core/res/js/revive-controls'),
            '/WS.Core/res/js/revive-controls.js'
        );
        assert.equal(
            getModuleUrl('Types/lang/ru/ru.json'),
            '/Types/lang/ru/ru.json.js'
        );
        assert.equal(
            getModuleUrl('Core/Abstract.compatible'),
            '/WS.Core/core/Abstract.compatible.js'
        );
    });

    it('should return valid URL for css! plugin', () => {
        assert.equal(
            getModuleUrl('css!RequireJsLoader/conduct'),
            '/RequireJsLoader/conduct.css'
        );
        assert.equal(
            getModuleUrl('css!themes/default'),
            '/ThemesModule/default.css'
        );

        // create an environment of a local demo stand,
        // specifically without appRoot and APP_PATH
        wsConfig.APP_PATH = '';
        defaultContext.config.baseUrl = '';
        assert.equal(
            getModuleUrl('css!themes/default'),
            '/ThemesModule/default.css'
        );
    });

    it('should return valid URL for css! plugin for auth applications with virtual service', () => {
        assert.equal(
            getModuleUrl('css!themes/default'),
            '/ThemesModule/default.css'
        );

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
        defaultContext.config.paths['themes'] = '/auth/resources/auth/ThemesModule';
        assert.equal(
            getModuleUrl('css!themes/default'),
            '/auth/resources/auth/ThemesModule/default.css'
        );
    });

    it('should return url without static service url for root meta', () => {
        wsConfig.appRoot = '/';
        wsConfig.wsRoot = '/static/resources/WS.Core';
        wsConfig.resourceRoot = '/static/resources/';
        wsConfig.metaRoot = '/resources/';
        assert.equal(
            getModuleUrl('RequireJsLoader/conduct'),
            '/static/RequireJsLoader/conduct.js'
        );
        assert.equal(
            getModuleUrl('router'),
            '/resources/router.js'
        );
    });

    it('should return valid URL for third-party libraries(e.g. /cdn/)', () => {
        assert.equal(
            getModuleUrl('/cdn/library/production.js'),
            '/cdn/library/production.js'
        );
        assert.equal(
            getModuleUrl('browser!/cdn/library/production.js'),
            '/cdn/library/production.js'
        );
        assert.equal(
            getModuleUrl('browser!/cdn/library/production'),
            '/cdn/library/production.js'
        );
        assert.equal(
            getModuleUrl('css!/cdn/library/production'),
            '/cdn/library/production.css'
        );
        assert.equal(
            getModuleUrl('css!/cdn/library/production.css'),
            '/cdn/library/production.css'
        );
        assert.equal(
            getModuleUrl('/rtpack/current-package.js'),
            '/rtpack/current-package.js'
        );
        assert.equal(
            getModuleUrl('/demo_src/library/production.js'),
            '/demo_src/library/production.js'
        );
    });

    it('should cut off application root on server', () => {
        defaultContext.config.baseUrl = '/path/to/app/root/';
        wsConfig.APP_PATH = '/path/to/app/root/';
        assert.equal(
            getModuleUrl('RequireJsLoader/conduct'),
            '/RequireJsLoader/conduct.js'
        );
    });

    it('should cut off application path and add application root on server', () => {
        wsConfig.APP_PATH = '/path/to/app/root/';
        wsConfig.appRoot = '/current-service/'
        wsConfig.resourceRoot = '/someStatic/';
        assert.equal(
            getModuleUrl('/path/to/app/root/RequireJsLoader/conduct'),
            '/someStatic/RequireJsLoader/conduct.js'
        );
        wsConfig.APP_PATH = '/path/to/app/root';
        wsConfig.resourceRoot = '/someStatic/resources/';
        assert.equal(
            getModuleUrl('/path/to/app/root/RequireJsLoader/conduct'),
            '/someStatic/RequireJsLoader/conduct.js'
        );
    });

    it('should cut off application path and version header and add application root on server', () => {
        wsConfig.APP_PATH = '/path/to/app/root/';
        wsConfig.appRoot = '/current-service/';
        wsConfig.resourceRoot = '/someStatic/';
        assert.equal(
            getModuleUrl('/path/to/app/root/RequireJsLoader/conduct.js?x_module=test'),
            '/someStatic/RequireJsLoader/conduct.js'
        );
        wsConfig.resourceRoot = '/someStatic/resources/';
        assert.equal(
            getModuleUrl('/path/to/app/root/RequireJsLoader/conduct.js?x_module=test'),
            '/someStatic/RequireJsLoader/conduct.js'
        );
    });

    it('shouldn\'t cut off application root on client', () => {
        defaultContext.config.baseUrl = '/path/to/app/root/assets/';
        wsConfig.APP_PATH = '/path/to/app/root/';
        wsConfig.IS_SERVER_SCRIPT = false;
        assert.equal(
            getModuleUrl('RequireJsLoader/conduct'),
            '/path/to/app/root/assets/RequireJsLoader/conduct.js'
        );
    });

    it('should cut off application root in builder environment', () => {
        defaultContext.config.baseUrl = '/path/to/app/root/';
        wsConfig.APP_PATH = '/path/to/app/root/';
        wsConfig.IS_SERVER_SCRIPT = false;
        wsConfig.IS_BUILDER = true;
        wsConfig.RESOURCES_PATH = '/';
        assert.equal(
            getModuleUrl('css!themes/default'),
            '/ThemesModule/default.css'
        );
        wsConfig.RESOURCES_PATH = '/resources/';
        assert.equal(
            getModuleUrl('css!themes/default'),
            '/resources/ThemesModule/default.css'
        );
    });

    it('should return URL with domain name', () => {
        wsConfig.staticDomains = {domains: ['foo.bar']};
        assert.equal(getModuleUrl('RequireJsLoader/conduct'), '//foo.bar/RequireJsLoader/conduct.js');
    });

    it('shouldn\'t return URL with domain name even though domain is selected if this is disabled by user', () => {
        wsConfig.staticDomains = {domains: ['foo.bar']};
        assert.equal(getModuleUrl('RequireJsLoader/conduct', undefined, undefined, true), '/RequireJsLoader/conduct.js');
    });

    it('should return URL with domain name', () => {
        defaultContext.nameToUrl = () => '//foo.bar/RequireJsLoader/conduct.js';
        wsConfig.APP_PATH = '/';
        const result = getModuleUrl('RequireJsLoader/conduct');
        assert.equal(result , '//foo.bar/RequireJsLoader/conduct.js');
    });
});
