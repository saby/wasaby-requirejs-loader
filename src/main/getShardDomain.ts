/**
 * Получения шардированого домена
 * @author Кудрявцев И.С.
 */
import { IPatchedGlobal } from 'RequireJsLoader/wasaby';

/**
 * Возвращает шардированый домен, если он есть
 */
export default function getShardDomain(): string | undefined {
    // @ts-ignore
    const globalEnv: IPatchedGlobal = globalThis;

    return globalEnv.wsConfig.shardDomain || '';
}
