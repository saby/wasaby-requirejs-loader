define([
   'require'
], function (
   require
) {
   describe('require()', function() {
      var checkDone = function(callback, done) {
         try {
            callback();
            done();
         } catch (e) {
            done(e);
         }
      };

      var shouldSkip = function(testCase) {
         if (typeof window === 'undefined') {
            testCase.skip();
            return true;
         }
      };

      it('should define module', function (done) {
         require(['WSTests/Demo/ModuleA'], function(given) {
            checkDone(function() {
               assert.equal(given, 'ModuleA.js');
            }, done);
         }, done);
      });

      describe('html!', function () {
         it('should define module', function (done) {
            require(['html!WSTests/Demo/ModuleA'], function(given) {
               checkDone(function() {
                  assert.equal(given, 'ModuleA.xhtml');
               }, done);
            }, done);
         });

         it('should define module without plugin if module with plugin has been required before', function (done) {
            if (shouldSkip(this)) {
               return;
            }

            require(['html!WSTests/Demo/ModuleB'], function(given) {
               checkDone(function() {
                  assert.equal(given, 'ModuleB.xhtml');
               }, function(e) {
                  if (e) {
                     done(e);
                  }
                  require(['WSTests/Demo/ModuleB'], function(given) {
                     checkDone(function() {
                        assert.equal(given, 'ModuleB.js');
                     }, done);
                  }, done);
               });
               }, done);

         });
      });

      describe('tmpl!', function () {
         it('should define module', function (done) {
            require(['wml!WSTests/Demo/ModuleC'], function(given) {
               checkDone(function() {
                  assert.equal(given, 'ModuleC.wml');
               }, done);
            }, done);
         });

         it('should define module without plugin if module with plugin has been required before', function (done) {
            if (shouldSkip(this)) {
               return;
            }

            require(['wml!WSTests/Demo/ModuleD'], function(given) {
               checkDone(function() {
                  assert.equal(given, 'ModuleD.wml');
               }, function(e) {
                  if (e) {
                     done(e);
                  }
                  require(['WSTests/Demo/ModuleD'], function(given) {
                     checkDone(function() {
                        assert.equal(given, 'ModuleD.js');
                     }, done);
                  }, done);
               });

            }, done);
         });
      });

      describe('js!', function () {
         it('should define module', function (done) {
            require(['WSTests/Demo/ModuleE'], function(given) {
               checkDone(function() {
                  assert.equal(given, 'ModuleE.js');
               }, done);
            }, done);
         });
      });
   });
});
