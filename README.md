# Wasaby RequireJS Loader
RequireJS-based modules loader. Provides API of requirejs for Wasaby application.

Responsible: Kolbeshin Fedor.

[API documentation](https://wi.sbis.ru/docs/js/RequireJsLoader)

## Installation in production mode
Not applicable.

## Installation in development mode

1. Clone the repository in separated folder:

    git clone git@git.sbis.ru:saby/wasaby-requirejs-loader.git

1. Install dependencies:

    npm install

1. Build the project:

    npm run build

### Available scripts

- Compile TypeScript:

    npm run build:compile

- Run unit tests in Node.js:

    npm test

- Run unit tests in Node.js and display coverage report:

    npm test:coverage

- Minify RequireJS:

    npm run build:require-min
