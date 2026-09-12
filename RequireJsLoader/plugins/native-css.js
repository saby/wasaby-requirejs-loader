/*
 * Require-CSS RequireJS css! loader plugin
 * 0.1.8
 * Guy Bedford 2014
 * MIT
 */

/*
 *
 * Usage:
 *  require(['css!./mycssFile']);
 *
 * Tested and working in (up to latest versions as of March 2013):
 * Android
 * iOS 6
 * IE 6 - 10
 * Chome 3 - 26
 * Firefox 3.5 - 19
 * Opera 10 - 12
 *
 * browserling.com used for virtual testing environment
 *
 * Credit to B Cavalier & J Hann for the IE 6 - 9 method,
 * refined with help from Martin Cermak
 *
 * Sources that helped along the way:
 * - https://developer.mozilla.org/en-US/docs/Browser_detection_using_the_user_agent
 * - http://www.phpied.com/when-is-a-stylesheet-really-loaded/
 * - https://github.com/cujojs/curl/blob/master/src/curl/plugin/css.js
 *
 */

define('native-css', [], function () {
   // >>excludeStart('excludeRequireCss', pragmas.excludeRequireCss)
   if (
      typeof window === 'undefined' ||
      typeof window.navigator === 'undefined' ||
      typeof document === 'undefined' ||
      typeof document.getElementsByTagName === 'undefined'
   ) {
      return {
         load: function (n, r, load) {
            load();
         }
      };
   }

   var inIFrame = (function () {
      return window.self !== window.top;
   })();

   var head = document.getElementsByTagName('head')[0];

   var engine =
      window.navigator.userAgent.match(
         /Trident\/([^ ;]*)|AppleWebKit\/([^ ;]*)|Opera\/([^ ;]*)|rv:([^ ;]*)(.*?)Gecko\/([^ ;]*)|MSIE\s([^ ;]*)|AndroidWebKit\/([^ ;]*)/
      ) || 0;

   // use <style> @import load method (IE < 9, Firefox < 18)
   var useImportLoad = false;

   // set to false for explicit <link> load checking when onload doesn't work perfectly (webkit)
   var useOnload = true;

   if (engine[1] || engine[7]) {
      // trident / msie
      useImportLoad = parseInt(engine[1], 10) < 6 || parseInt(engine[7], 10) <= 9;
   } else if (engine[2] || engine[8]) {
      // webkit
      useOnload = false;
   } else if (engine[4]) {
      // gecko
      useImportLoad = parseInt(engine[4], 10) < 18;
   }

   // >>excludeEnd('excludeRequireCss')
   // main api object
   var cssAPI = {};

   // >>excludeStart('excludeRequireCss', pragmas.excludeRequireCss)
   cssAPI.pluginBuilder = './css-builder';

   // <style> @import load method
   var curStyle, curSheet;
   var createStyle = function () {
      curStyle = document.createElement('style');
      curStyle.setAttribute('type', 'text/css');
      head.appendChild(curStyle);
      curSheet = curStyle.styleSheet || curStyle.sheet;
   };
   var ieCnt = 0;
   var ieLoads = [];
   var ieCurCallback;

   var processIeLoad = function (creater) {
      ieCurCallback();

      var nextLoad = ieLoads.shift();

      if (!nextLoad) {
         ieCurCallback = null;
         return;
      }

      ieCurCallback = nextLoad[1];
      creater(nextLoad[0]);
   };

   var createIeLoad = function (url) {
      curSheet.addImport(url);

      if (inIFrame) {
         setTimeout(function () {
            processIeLoad(createIeLoad);
         }, 10);
      } else {
         curStyle.onload = function () {
            processIeLoad(createIeLoad);
         };
      }

      ieCnt++;
      if (ieCnt === 31) {
         createStyle();
         ieCnt = 0;
      }
   };

   var importLoad = function (url, callback) {
      if (!curSheet || !curSheet.addImport) {
         createStyle();
      }

      if (curSheet && curSheet.addImport) {
         // old IE
         if (ieCurCallback) {
            ieLoads.push([url, callback]);
         } else {
            createIeLoad(url);
            ieCurCallback = callback;
         }
      } else {
         // old Firefox
         curStyle.textContent = '@import "' + url + '";';

         var loadInterval = setInterval(function () {
            try {
               // eslint-disable-next-line no-unused-vars
               var a = curStyle.sheet.cssRules;
               clearInterval(loadInterval);
               callback();
            } catch (e) {
               // Do nothing
            }
         }, 10);
      }
   };

   var existsLink = function (url) {
      for (var i = 0; i < document.styleSheets.length; i++) {
         var sheet = document.styleSheets[i];
         if (sheet.href && sheet.href.substr(-url.length) === url) {
            return true;
         }
      }
      return false;
   };

   // <link> load method
   var linkLoad = function (url, callback) {
      var link = document.createElement('link');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      if (useOnload) {
         link.onload = function () {
            link.onload = function () {
               // do nothing.
            };

            // for style dimensions queries, a short delay can still be necessary
            setTimeout(callback, 7);
         };
         link.onerror = function () {
            link.onerror = function () {
               // do nothing.
            };

            // for style dimensions queries, a short delay can still be necessary
            setTimeout(callback, 7);
         };
      } else {
         var loadInterval = setInterval(function () {
            if (existsLink(link.href)) {
               clearInterval(loadInterval);
               callback();
            }
         }, 10);
      }

      link.href = url;

      // add data-vdomignore attribute so that vdom would ignore these link tags
      link.setAttribute('data-vdomignore', 'true');
      head.appendChild(link);
   };

   // >>excludeEnd('excludeRequireCss')
   cssAPI.normalize = function (initialName, normalize) {
      var name = initialName;
      if (name.substr(name.length - 4, 4) === '.css') {
         name = name.substr(0, name.length - 4);
      }

      return normalize(name);
   };

   // >>excludeStart('excludeRequireCss', pragmas.excludeRequireCss)
   cssAPI.load = function (inititalCssId, req, load) {
      var cssId = inititalCssId;
      if (cssId.indexOf('theme?') > -1) {
         cssId = cssId.replace('theme?', '');
      }
      var hasExtention = cssId.split('?', 2)[0].substr(-4).toLowerCase() === '.css';
      var url = req.toUrl(cssId + (hasExtention ? '' : '.css'));
      if (existsLink(url)) {
         load();
      } else {
         (useImportLoad ? importLoad : linkLoad)(url, load);
      }
   };

   // >>excludeEnd('excludeRequireCss')
   return cssAPI;
});
