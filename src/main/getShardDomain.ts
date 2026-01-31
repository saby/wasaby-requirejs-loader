import { IPatchedGlobal } from 'RequireJsLoader/wasaby';

export default function getShardDomain(): string | undefined {
    // @ts-ignore
    const globalEnv: IPatchedGlobal = globalThis;

    return globalEnv.wsConfig.shardDomain || '';
}
