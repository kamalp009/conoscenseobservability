# includes [![CI][ci-badge]][ci-link]

Determine whether or not a value is contained by a given collection.

Uses [SameValueZero][] (the algorithm used by Object.is) for equality comparisons.

## Installation

```sh
$ component install ndhoule/includes
$ npm install @ndhoule/includes
```

## API

### `includes(searchElement : *, collection : Object|Array|string) => boolean`

```javascript
includes(2, [1, 2, 3]);
//=> true

includes(4, [1, 2, 3]);
//=> false

includes(2, { a: 1, b: 2, c: 3 });
//=> true

includes('a', { a: 1, b: 2, c: 3 });
//=> false

includes('abc', 'xyzabc opq');
//=> true

includes('nope', 'xyzabc opq');
//=> false
```

## License

Released under the [MIT license](LICENSE.md).


[SameValueZero]: https://esdiscuss.org/topic/samevaluezero-comparator-and-compatibility
[ci-link]: https://travis-ci.org/ndhoule/includes
[ci-badge]: https://travis-ci.org/ndhoule/includes.svg?branch=master
