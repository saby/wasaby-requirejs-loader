import type WebRequire from '../../WebRequire';
import getFontInfo, { IFontEnvironment } from '../../main/getFontInfo';

export default async function (
    _defineName: string,
    filePath: string,
    context: WebRequire
): Promise<boolean> {
    try {
        const [env] = (await context.require(['optional!Env/Env'])) as [IFontEnvironment];
        const font = getFontInfo(filePath, env);

        await context.require([`css!${font.path}`]);
        await document.fonts.load(`16px "${font.family}"`);

        return true;
    } catch (err) {
        if (typeof console === 'object') {
            // eslint-disable-next-line no-console
            console.error(err);
        }

        return false;
    }
}
