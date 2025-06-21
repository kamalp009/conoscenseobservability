# pick [![CI][ci-badge]][ci-link]

Create a shallow copy of an input object that contains only the specified properties.

```sh
$ component install ndhoule/pick
$ npm install @ndhoule/pick
```

## API

### `pick(props : string|string[], object: Object) => Object`

Return a shallow copy of an input `object` containing only a specified list of properties.

```javascript
var person = { name: 'Tim', occupation: 'enchanter', fears: 'rabbits' };

pick('name', person);
//=> { name: 'Tim' }

pick(['name', 'fears'], person);
//=> { name: 'Tim', fears: 'rabbits' }
```

## License

Released under the [MIT license](LICENSE.md).

[ci-link]: https://travis-ci.org/ndhoule/pick
[ci-badge]: https://travis-ci.org/ndhoule/pick.svg?branch=master
