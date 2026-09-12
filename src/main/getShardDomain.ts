/**
 * Получения шардированого домена
 * @author Кудрявцев И.С.
 */
import { IPatchedGlobal } from 'RequireJsLoader/wasaby';

// @ts-ignore
const globalEnv: IPatchedGlobal = globalThis;

/**
 * Возвращает шардированый домен, если он есть
 */
export default function getShardDomain(): string | undefined {
    return globalEnv.wsConfig.shardDomain || '';
}
