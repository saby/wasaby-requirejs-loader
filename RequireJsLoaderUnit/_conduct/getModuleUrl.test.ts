import { assert } from 'chai';
import getModuleUrl from 'RequireJsLoader/_conduct/getModuleUrl';
import { global } from 'RequireJsLoader/_extras/utils';
import { IWsConfig } from 'RequireJsLoader/wasaby';
import { IRequireExt } from '../../RequireJsLoader/require.ext';

const originalWsConfig = global.wsConfig;

describe('RequireJsLoader/_conduct/getModuleUrl', () => {
    const defaultContext = (requirejs as IRequireExt).s.contexts._;
    const originalConfig = {...defaultContext.config};
    const originalNameToUrl = defaultContext.nameToUrl;

    let wsConfig: IWsConfig;

    beforeEach(() => {
        wsConfig = global.wsConfig = Object.assign({}, originalWsConfig);
    });

    afterEach(() => {
        global.wsConfig = originalWsConfig;

        Object.assign(defaultContext.config, originalConfig);
        defaultContext.nameToUrl = originalNameToUrl;
    });

    it('should return valid module URL', () => {
        assert.equal(
            getModuleUrl('RequireJsLoader/conduct'),
            '/RequireJsLoader/conduct.js'
        );
    });

    it('should return valid URL for css! plugin', () => {
        assert.equal(
            getModuleUrl('css!RequireJsLoader/conduct'),
            '/RequireJsLoader/conduct.css'
        );
        assert.equal(
            getModuleUrl('css!themes/default'),
            '/themes/default.css'
        );

        // create an environment of a local demo stand,
        // specifically without appRoot and APP_PATH
        wsConfig.APP_PATH = '';
        defaultContext.config.baseUrl = '';
        assert.equal(
            getModuleUrl('css!themes/default'),
            '/themes/default.css'
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
        assert.equal(
            getModuleUrl('/path/to/app/root/RequireJsLoader/conduct'),
            '/current-service/RequireJsLoader/conduct.js'
        );
        wsConfig.APP_PATH = '/path/to/app/root';
        assert.equal(
            getModuleUrl('/path/to/app/root/RequireJsLoader/conduct'),
            '/current-service/RequireJsLoader/conduct.js'
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
            '/themes/default.css'
        );
        wsConfig.RESOURCES_PATH = '/resources/';
        assert.equal(
            getModuleUrl('css!themes/default'),
            '/resources/themes/default.css'
        );
    });

    it('should return URL with domain name', () => {
        wsConfig.staticDomains = {domains: ['foo.bar']};
        assert.equal(getModuleUrl('RequireJsLoader/conduct'), '//foo.bar/RequireJsLoader/conduct.js');
    });

    it('should return URL with domain name', () => {
        defaultContext.nameToUrl = () => '//foo.bar/RequireJsLoader/conduct.js';
        wsConfig.APP_PATH = '/';
        const result = getModuleUrl('RequireJsLoader/conduct');
        assert.equal(result , '//foo.bar/RequireJsLoader/conduct.js');
    });
});
