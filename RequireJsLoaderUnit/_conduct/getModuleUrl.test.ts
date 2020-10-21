import { assert } from 'chai';
import getModuleUrl from 'RequireJsLoader/_conduct/getModuleUrl';
import { global } from 'RequireJsLoader/_extras/utils';
// @ts-ignore
import { createConfig } from 'RequireJsLoader/config';
import { IWsConfig } from 'RequireJsLoader/wasaby';

const originalWsConfig = global.wsConfig;

describe('RequireJsLoader/_conduct/getModuleUrl', () => {
    let wsConfig: IWsConfig;

    beforeEach(() => {
        wsConfig = global.wsConfig = Object.assign({}, originalWsConfig);
    });

    afterEach(() => {
        global.wsConfig = originalWsConfig;
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
    });

    it('should return URL with domain name', () => {
        wsConfig.staticDomains = {domains: ['foo.bar']};
        assert.equal(getModuleUrl('RequireJsLoader/conduct'), '//foo.bar/RequireJsLoader/conduct.js');
    });

    it('should return URL with domain name', () => {
        wsConfig.APP_PATH = '/';

        const context = requirejs.s.contexts._;
        const originalNameToUrl = context.nameToUrl;
        context.nameToUrl = () => '//foo.bar/RequireJsLoader/conduct.js';
        const result = getModuleUrl('RequireJsLoader/conduct');
        context.nameToUrl = originalNameToUrl;

        assert.equal(result , '//foo.bar/RequireJsLoader/conduct.js');
    });
});
