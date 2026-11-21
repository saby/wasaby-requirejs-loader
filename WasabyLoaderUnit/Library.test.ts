import { parse, extract } from 'WasabyLoader/Library';

describe('WasabyLoader/Library', () => {
    describe('parse()', () => {
        test('should return given module name', () => {
            const result = parse('Foo/bar');

            expect(result.name).toStrictEqual('Foo/bar');
            expect(result.path).toEqual([]);
        });

        test("should return library's base name and singular path", () => {
            const result = parse('Foo/bar:baz');

            expect(result.name).toStrictEqual('Foo/bar');
            expect(result.path).toEqual(['baz']);
        });

        test("should return library's base name and long path", () => {
            const result = parse('Foo/bar:baz.shmaz');

            expect(result.name).toStrictEqual('Foo/bar');
            expect(result.path).toEqual(['baz', 'shmaz']);
        });
    });

    describe('extract()', () => {
        test('should return given module if there is no path', () => {
            const bar = {};
            const meta = parse('Foo/bar');

            expect(extract(bar, meta)).toStrictEqual(bar);
        });

        test('should return default implementation for ES-like module', () => {
            const bar = {
                __esModule: true,
                default: 'bar',
            };
            const meta = parse('Foo/bar');

            expect(extract(bar, meta)).toStrictEqual(bar.default);
        });

        test('should extract module by path', () => {
            const shmaz = {};
            const bar = { baz: { shmaz } };
            const meta = parse('Foo/bar:baz.shmaz');

            expect(extract(bar, meta)).toStrictEqual(shmaz);
        });

        test('should return ReferenceError if module is not found by given path', () => {
            const bar = { baz: 'foo' };
            const meta = parse('Foo/bar:baz.shmaz');
            const result = extract(bar, meta) as ReferenceError;

            expect(result).toBeInstanceOf(ReferenceError);
            expect(result.message.indexOf('baz.shmaz') > -1).toBeTruthy();
        });

        test('should return field of function', () => {
            const foo = {};
            const bar = function () {};

            bar.foo = foo;
            const meta = parse('Foo/bar:foo');

            expect(extract(bar, meta)).toStrictEqual(foo);
        });
    });
});
