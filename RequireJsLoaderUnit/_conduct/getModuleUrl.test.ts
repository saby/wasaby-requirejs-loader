import { assert } from 'chai';
import getModuleUrl from 'RequireJsLoader/_conduct/getModuleUrl';
import { global } from 'RequireJsLoader/_extras/utils';
// @ts-ignore
import { createConfig } from 'RequireJsLoader/config';

const originalWsConfig = global.wsConfig;

describe('RequireJsLoader/_conduct/getModuleUrl', () => {
    beforeEach(() => {
        global.wsConfig = Object.assign({}, global.wsConfig);
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

    it('should return valid plugin+module URL', () => {
        assert.equal(
            getModuleUrl('css!RequireJsLoader/conduct'),
            '/RequireJsLoader/conduct.css'
        );
    });

    it('should return URL with domain name', () => {
        global.wsConfig.staticDomains = {domains: ['foo.bar']};
        assert.equal(getModuleUrl('RequireJsLoader/conduct'), '//foo.bar/RequireJsLoader/conduct.js');
     });
  });
