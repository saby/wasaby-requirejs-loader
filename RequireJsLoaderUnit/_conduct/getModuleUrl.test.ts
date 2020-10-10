import { assert } from 'chai';
import getModuleUrl from 'RequireJsLoader/_conduct/getModuleUrl';

describe('RequireJsLoader/_conduct/getModuleUrl', () => {
    it('should return valid module URL', () => {
        assert.include(
            getModuleUrl('RequireJsLoader/conduct'),
            '/RequireJsLoader/conduct.js'
        );
    });

    it('should return valid plugin+module URL', () => {
        assert.include(
            getModuleUrl('css!RequireJsLoader/conduct'),
            '/RequireJsLoader/conduct.css'
        );
    });
});
