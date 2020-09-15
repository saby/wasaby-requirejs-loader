define("browser", ["require", "exports"], function (require, exports) {
    "use strict";
    var browser = {
        load: function (name, require, onLoad) {
            if (typeof window === 'undefined') {
                onLoad(null);
                return;
            }
            require([name], onLoad, function (err) {
                onLoad.error(err);
            });
        }
    };
    return browser;
});
