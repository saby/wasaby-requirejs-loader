import { IPatchedGlobal } from 'RequireJsLoader/wasaby';

// @ts-ignore
const globalEnv: IPatchedGlobal = globalThis;

export default function getStaticsDomain(): string | undefined {
    if (Array.isArray(globalEnv.wsConfig.staticDomains)) {
        return globalEnv.wsConfig.staticDomains[0];
    }

    return globalEnv.wsConfig.staticDomains?.domains?.[0];
}
