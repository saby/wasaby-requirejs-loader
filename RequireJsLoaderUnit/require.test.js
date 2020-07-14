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

      function shouldSkip(testCase) {
         if (typeof window === 'undefined') {
            testCase.skip();
            return true;
         }
      }

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

      describe('using html! plugin', () => {
         after(() => {
            requirejs.undef('html!RequireJsLoaderUnit/fixtures/ModuleA');
            requirejs.undef('RequireJsLoaderUnit/fixtures/ModuleA');
         });

         it('should return defined module body', function () {
            return asyncRequire(['html!RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then(([result]) => {
               assert.equal(result, 'RequireJsLoaderUnit/fixtures/ModuleA.xhtml');
            });
         });

         it('should return module without plugin if module with plugin has been required before', function() {
            if (shouldSkip(this)) {
               return;
            }

            return asyncRequire(['html!RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then(([pluginResult]) => {
               assert.equal(pluginResult, 'RequireJsLoaderUnit/fixtures/ModuleA.xhtml');
            }).then(() => {
               return asyncRequire(['RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then(([noPluginResult]) => {
                  assert.equal(noPluginResult, 'RequireJsLoaderUnit/fixtures/ModuleA/foo.js');
               })
            });
         });
      });

      describe('using tmpl! plugin', () => {
         after(() => {
            requirejs.undef('tmpl!RequireJsLoaderUnit/fixtures/ModuleA');
            requirejs.undef('RequireJsLoaderUnit/fixtures/ModuleA');
         });

         it('should return defined module body', function () {
            return asyncRequire(['tmpl!RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then(([result]) => {
               assert.equal(result, 'RequireJsLoaderUnit/fixtures/ModuleA.tmpl');
            });
         });

         it('should return module without plugin if module with plugin has been required before', function() {
            if (shouldSkip(this)) {
               return;
            }

            return asyncRequire(['tmpl!RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then(([pluginResult]) => {
               assert.equal(pluginResult, 'RequireJsLoaderUnit/fixtures/ModuleA.tmpl');
            }).then(() => {
               return asyncRequire(['RequireJsLoaderUnit/fixtures/ModuleA'], contextRequire).then(([noPluginResult]) => {
                  assert.equal(noPluginResult, 'RequireJsLoaderUnit/fixtures/ModuleA.js');
               })
            });
         });
      });
   });
});
