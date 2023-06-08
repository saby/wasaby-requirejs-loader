import {IPatchedWindow} from '../wasaby';

interface IRequireWithPageVisibility extends Require {
    isPageHidden?: boolean;
}

/**
 * Invokes given callback on page visibility change
 * @param callback Callback to invoke
 */
function onPageVisibilityChange(callback: Function): void {
    const feature = ((features) => {
        for (let i = 0; i < features.length; i++) {
            if (typeof document[features[i].property] !== 'undefined') {
                return features[i];
            }
        }
    })([
        {property: 'hidden', event: 'visibilitychange'},
        {property: 'msHidden', event: 'msvisibilitychange'},
        {property: 'webkitHidden', event: 'webkitvisibilitychange'}
    ]);

    if (feature && typeof document.addEventListener) {
        document.addEventListener(feature.event, () => {
            callback(document[feature.property]);
        }, false);
        if (document[feature.property]) {
            callback(document[feature.property]);
        }
    }
}

// This applies only in browser
if (
    typeof window !== 'undefined' &&
    (window as unknown as IPatchedWindow).requirejs &&
    (window as unknown as IPatchedWindow).requirejs.s
) {
    const rootRequire = (window as unknown as IPatchedWindow).requirejs;
    const defaultTimeout: number = rootRequire.s.contexts._.config.waitSeconds;

    // Disable loading timeout on hidden page
    onPageVisibilityChange((isHidden) => {
        (rootRequire as IRequireWithPageVisibility).isPageHidden = isHidden;
        rootRequire.config({
            waitSeconds: isHidden ? 0 : defaultTimeout
        });
    });
}
