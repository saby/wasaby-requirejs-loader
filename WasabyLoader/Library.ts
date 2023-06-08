/**
 * Workaround for library module name syntax support.
 * @public
 * @author Колбешин Ф.А.
 */

const RETRIEVABLE_TYPES: string[] = [
    'object',
    'function'
];

interface ILibrary<T> {
   [propName: string]: T | ILibrary<T>;
}

interface IParsed {
   name: string;
   path: string[];
}

/**
 * Loads module as a library.
 * @param name Module name like 'Library/Name:Path.To.Module' or just 'Module/Name'
 * @return Loaded module
 * @public
 * @deprecated Use WasabyLoader/ModulesLoader:loadAsync instead
 */
export function load<T>(name: string): Promise<T> {
    return import('WasabyLoader/ModulesLoader').then(({loadAsync}) => {
        return loadAsync(name);
    });
}

/**
 * Extracts module from the library.
 * @param exports Library implementation
 * @param info Library info
 * @return Module implementation
 * @public
 */
export function extract<T>(exports: T | ILibrary<T>, info: IParsed): T | ReferenceError {
   let module = exports;

   if (info.path.length) {
      // Extract module by the path
      const processed = [];
      for (let i = 0; i < info.path.length; i++) {
         const property = info.path[i];
         processed.push(property);
         if (module && RETRIEVABLE_TYPES.includes(typeof module) && property in module) {
            module = module[property];
         } else {
            return new ReferenceError(
               `Cannot find module "${processed.join('.')}" in library "${info.name}".`
            );
         }
      }
   } else {
      // The library is module itself. But mind the default export for ES6 modules.
      if (module && (module as ILibrary<T>).__esModule && (module as ILibrary<T>).default) {
         module = (module as ILibrary<T>).default;
      }
   }

   return module as T;
}

/**
 * Parses module declaration include library name name and path.
 * @param name Module name like 'Library/Name:Path.To.Module' or just 'Module/Name'
 * @public
 */
export function parse(name: string): IParsed {
   const parts = String(name || '').split(':', 2);
   return {
      name: parts[0],
      path: parts[1] ? parts[1].split('.') : []
   };
}
