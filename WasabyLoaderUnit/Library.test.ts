import {assert} from 'chai';
import {parse, extract} from 'WasabyLoader/Library';

describe('WasabyLoader/Library', () => {
    describe('parse()', () => {
        it('should return given module name', () => {
            const result = parse('Foo/bar');
            assert.strictEqual(result.name, 'Foo/bar');
            assert.deepEqual(result.path, []);
        });

        it('should return library\'s base name and singular path', () => {
            const result = parse('Foo/bar:baz');
            assert.strictEqual(result.name, 'Foo/bar');
            assert.deepEqual(result.path, ['baz']);
        });

        it('should return library\'s base name and long path', () => {
            const result = parse('Foo/bar:baz.shmaz');
            assert.strictEqual(result.name, 'Foo/bar');
            assert.deepEqual(result.path, ['baz', 'shmaz']);
        });
    });

    describe('extract()', () => {
        it('should return given module if there is no path', () => {
            const bar = {};
            const meta = parse('Foo/bar');

            assert.strictEqual(extract(bar, meta), bar);
        });

        it('should return default implementation for ES-like module', () => {
            const bar = {
                __esModule: true,
                default: 'bar'
            };
            const meta = parse('Foo/bar');

            assert.strictEqual(extract(bar, meta), bar.default);
        });

        it('should extract module by path', () => {
            const shmaz = {};
            const bar = {baz: {shmaz}};
            const meta = parse('Foo/bar:baz.shmaz');

            assert.strictEqual(extract(bar, meta), shmaz);
        });

        it('should return ReferenceError if module is not found by given path', () => {
            const bar = {baz: 'foo'};
            const meta = parse('Foo/bar:baz.shmaz');
            const result = extract(bar, meta) as ReferenceError;
            assert.instanceOf(result, ReferenceError);
            assert.isTrue(result.message.indexOf('baz.shmaz') > -1);
        });

        it('should return field of function', () => {
            const foo = {};
            const bar = function() {};
            bar.foo = foo;
            const meta = parse('Foo/bar:foo');
            assert.strictEqual(extract(bar, meta), foo);
        });
    });
});
