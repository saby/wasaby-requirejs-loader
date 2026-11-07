import type ServerRequire from '../../ServerRequire';
import getFontInfo, { IFontEnvironment } from '../../main/getFontInfo';

export default function (_defineName: string, filePath: string, context: ServerRequire): boolean {
    let env: IFontEnvironment | undefined;

    try {
        env = context.require('Env/Env') as IFontEnvironment;
    } catch {
        env = undefined;
    }

    try {
        const font = getFontInfo(filePath, env);
        const { Head } = context.require('Application/Page') as {
            Head: {
                getInstance(): {
                    createTag(name: string, attrs: Record<string, string>): unknown;
                };
            };
        };
        const head = Head.getInstance();

        head.createTag('link', {
            rel: 'preload',
            type: 'font/woff2',
            as: 'font',
            href: context.buildUrl(font.path, 'woff2'),
            crossorigin: 'anonymous',
        });
        head.createTag('link', {
            rel: 'stylesheet',
            type: 'text/css',
            href: context.buildUrl(font.path, 'css'),
            crossorigin: 'anonymous',
        });

        return true;
    } catch (err) {
        if (typeof console === 'object') {
            // eslint-disable-next-line no-console
            console.error(err);
        }

        return false;
    }
}
