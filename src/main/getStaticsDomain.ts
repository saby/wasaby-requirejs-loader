/**
 * Получение домена для статики
 * @author Кудрявцев И.С.
 */
import { IPatchedGlobal } from 'RequireJsLoader/wasaby';

const EMPTY_ARRAY: string[] = [];

export default function getAllStaticDomains(): string[] {
    // @ts-ignore
    const globalEnv: IPatchedGlobal = globalThis;

    if (Array.isArray(globalEnv.wsConfig.staticDomains)) {
        return globalEnv.wsConfig.staticDomains;
    }

    return globalEnv.wsConfig.staticDomains?.domains || EMPTY_ARRAY;
}
