const fs = require('node:fs/promises');
const path = require('node:path');
const typescriptPlugin = require('@rollup/plugin-typescript').default;
const terserPlugin = require('@rollup/plugin-terser').default;
const { rollup } = require('rollup');
const pMap = require('p-map');
const zlib = require('zlib');

const BUNDLES = ['ServerRequire', 'WebRequire', 'initRequire'];

const brotliOptions = {
   params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 10
   }
};

function compress(data) {
   return new Promise((resolve, reject) => {
      zlib.brotliCompress(data, brotliOptions, (err, compressed) => {
         if (err) {
            reject(err);
         } else {
            resolve(compressed);
         }
      });
   });
}

function brotli() {
   return {
      name: 'brotli',

      async renderChunk(code, chunk, outputOptions) {
         if (chunk.name === 'WebRequire') {
            await fs.writeFile(
               path.join(process.cwd(), `${outputOptions.file}.br`),
               await compress(code)
            );
         }

         return code;
      }
   };
}

function addAllFunctionsCalledOnLoad() {
   return {
      name: 'add-all-functions-called-onload',
      renderChunk(code) {
         return `//# allFunctionsCalledOnLoad\n${code}`;
      }
   };
}

function buildConfig(entry) {
   return {
      inputOptions: {
         input: `./src/${entry}.ts`,
         plugins: [
            typescriptPlugin({
               compilerOptions: {
                  baseUrl: '.',
                  alwaysStrict: true,
                  target: 'es2019',
                  module: 'ES2015',
                  lib: ['dom', 'es2021', 'scripthost'],
                  moduleResolution: 'node'
               },
               noEmitOnError: true,
               include: ['./src/**/*.ts']
            })
         ]
      },
      outputOptions: [
         {
            file: `RequireJsLoader/third-party/${entry}.js`,
            format: 'iife',
            plugins: [addAllFunctionsCalledOnLoad()]
         },
         {
            file: `RequireJsLoader/third-party/${entry}.min.js`,
            format: 'iife',
            plugins: [
               terserPlugin({
                  ecma: 2019
               }),
               addAllFunctionsCalledOnLoad(),
               brotli()
            ]
         }
      ]
   };
}

async function build(entry) {
   const { inputOptions, outputOptions } = buildConfig(entry);
   let bundle;

   try {
      console.log(`Пакуем ${entry}`);

      bundle = await rollup(inputOptions);

      await pMap(outputOptions, async (outputOption) => {
         console.log(`Генерируем ${outputOption.file}`);

         await bundle.write(outputOption);

         console.log(`${outputOption.file} успешно сгенерен`);
      });

      console.log(`${entry} успешно спакован`);
   } catch (error) {
      // do some error reporting
      throw error;
   } finally {
      if (bundle) {
         // closes the bundle
         await bundle.close();
      }
   }
}

pMap(BUNDLES, async (bundleName) => {
   await build(bundleName);
}).then(
   () => {
      process.exit(0);
   },
   (err) => {
      console.error(err);
      process.exit(1);
   }
);
