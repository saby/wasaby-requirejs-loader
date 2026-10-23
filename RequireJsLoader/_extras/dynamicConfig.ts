import { IPatchedWindow } from '../wasaby';

interface IRequireWithPageVisibility extends Require {
    isPageHidden?: boolean;
}

interface IWasabyDocument extends Document {
    hidden: boolean;
    msHidden: boolean;
    webkitHidden: boolean;
}

interface IFeature {
    property: 'hidden' | 'msHidden' | 'webkitHidden';
    event: string;
}

const features: IFeature[] = [
    { property: 'hidden', event: 'visibilitychange' },
    { property: 'msHidden', event: 'msvisibilitychange' },
    { property: 'webkitHidden', event: 'webkitvisibilitychange' },
];

function getCurrentFeature(): IFeature | undefined {
    for (const feature of features) {
        if (typeof (document as IWasabyDocument)[feature.property] !== 'undefined') {
            return feature;
        }
    }
}

/**
 * Invokes given callback on page visibility change
 * @param callback Callback to invoke
 */
function onPageVisibilityChange(callback: (isHidden: boolean) => void): void {
    const feature = getCurrentFeature();

    if (feature && typeof document.addEventListener) {
        document.addEventListener(
            feature.event,
            () => {
                callback((document as IWasabyDocument)[feature.property]);
            },
            false
        );

        if ((document as IWasabyDocument)[feature.property]) {
            callback((document as IWasabyDocument)[feature.property]);
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
    const defaultTimeout: number = rootRequire.s.contexts._.config.waitSeconds || 0;

    // Disable loading timeout on hidden page
    onPageVisibilityChange((isHidden) => {
        (rootRequire as IRequireWithPageVisibility).isPageHidden = isHidden;
        rootRequire.config({
            waitSeconds: isHidden ? 0 : defaultTimeout,
        });
    });
}
