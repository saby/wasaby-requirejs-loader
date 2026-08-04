/**
 * Получение домена для статики
 * @author Кудрявцев И.С.
 */
import { IPatchedGlobal } from 'RequireJsLoader/wasaby';

/**
 * Возвращает домен для статики, если он есть
 */
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
