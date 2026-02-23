import { IPatchedGlobal } from 'RequireJsLoader/wasaby';

export default function getStaticsDomain(): string {
    // @ts-ignore
    const globalEnv: IPatchedGlobal = globalThis;
    let domain = '';

    if (Array.isArray(globalEnv.wsConfig.staticDomains)) {
        domain = globalEnv.wsConfig.staticDomains[0];
    } else {
        // @ts-ignore
        domain = globalEnv.wsConfig.staticDomains?.domains?.[0];
    }

    return domain ? `//${domain}` : '';
}
