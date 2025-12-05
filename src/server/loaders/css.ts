import type Module from '../../main/Module';

export default async function (module: Module): Promise<void> {
    module.define([], () => null);
}
