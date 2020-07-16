define([
   'require',
   'module',
   'RequireJsLoader/config'
], function (
   require,
   module,
   {createConfig}
) {
   describe('require()', function() {
      var defaultContext = requirejs.s.contexts._;
      var appPath = defaultContext.config.baseUrl;
      var config = createConfig(appPath);
      config.context = 'RequireJsLoaderUnit/require';
      var contextRequire = requirejs.config(config);

      function asyncRequire(names, loader) {
         return new Promise((resolve, reject) => {
            (loader || require)(names, (...results) => {
               resolve(results);
            }, reject);
         });
      }

      it('should return defined module body', () => {
         define('RequireJsLoaderUnit/require/foo', () => 'RequireJsLoaderUnit/require/foo.js');

         after(() => {
            requirejs.undef('RequireJsLoaderUnit/require/foo');
         });

         return asyncRequire(['RequireJsLoaderUnit/require/foo']).then(([result]) => {
            assert.equal(result, 'RequireJsLoaderUnit/require/foo.js');
         });
      });

      describe('using json! plugin', () => {
         after(() => {
            requirejs.undef('json!RequireJsLoaderUnit/fixtures/ModuleA');
            requirejs.undef('RequireJsLoaderUnit/fixtures/ModuleA');
         });

         it('should return defined module body', function () {
            return asyncRequire(['json!RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then(([result]) => {
               assert.deepEqual(result, ['RequireJsLoaderUnit/fixtures/ModuleA.json']);
            });
         });

         it('should return module without plugin if module with plugin has been required before', function() {
            return asyncRequire(['json!RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then(([pluginResult]) => {
               assert.deepEqual(pluginResult, ['RequireJsLoaderUnit/fixtures/ModuleA.json']);
            }).then(() => {
               return asyncRequire(['RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then(([noPluginResult]) => {
                  assert.equal(noPluginResult, 'RequireJsLoaderUnit/fixtures/ModuleA.js');
               })
            });
         });
      });
   });
});
