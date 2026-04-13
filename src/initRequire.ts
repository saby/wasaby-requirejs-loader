import { IPatchedGlobal } from 'RequireJsLoader/wasaby';

// TODO делан для стародрених страниц на WS3Page, где нет единой точки подключения и инцилизации require.
//  Поэтому надо дать возможность самоинцилизации. Надеюсь когда-нибудь это умерёт.
// @ts-ignore
const globalEnv: IPatchedGlobal = globalThis;

// @ts-ignore
globalEnv.initRequire();
