/* globals describe, it */
/* eslint-disable no-new-wrappers */

'use strict';

var assert = require('assert');
var pick = require('../');
var es5It = typeof Object.create === 'function' ? it : xit;

describe('pick', function() {
  it('should be a function', function() {
    assert.equal(typeof pick, 'function');
  });

  it('should have an arity of 2', function() {
    assert.equal(pick.length, 2);
  });

  it('should return a new object', function() {
    var source = { name: 'tim' };
    var result = pick('name', source);

    assert.equal(typeof result, 'object');
    assert.notEqual(result, source);
  });

  it('should return an object including only the specified `keep` property', function() {
    var source = { name: 'tim', occupation: 'enchanter' };
    var expected = { name: 'tim' };

    assert.deepEqual(pick('name', source), expected);
  });

  it('should return an object including only the specified `keep` properties', function() {
    var source = { name: 'tim', occupation: 'enchanter', scaredOf: 'rabbits' };
    var expected = { name: 'tim', scaredOf: 'rabbits' };

    assert.deepEqual(pick(['name', 'scaredOf'], source), expected);
  });

  it('should handle properties that don\'t exist on the target `object`', function() {
    var source = { name: 'tim', occupation: 'enchanter', scaredOf: 'rabbits' };

    assert.deepEqual(pick('nonexistent', source), {});
    assert.deepEqual(pick(['name', 'keys'], source), { name: 'tim' });
  });

  it('should handle an empty list of `props`', function() {
    var source = { name: 'tim', occupation: 'enchanter', scaredOf: 'rabbits' };

    assert.deepEqual(pick([], source), {});
  });

  it('should ignore non-string omissions', function() {
    var source = { name: 'tim', 'null': 'enchanter', 'undefined': 'rabbits' };

    assert.deepEqual(pick(null, source), {});
    assert.deepEqual(pick([null, undefined], source), {});
    assert.deepEqual(pick([null, 'name', undefined], source), { name: 'tim' });
  });

  it('should handle non-array/string `omissions` arguments', function() {
    var source = { name: 'tim', occupation: 'enchanter', scaredOf: 'rabbits' };

    assert.deepEqual(pick(null, source), {});
    assert.deepEqual(pick(undefined, source), {});
    assert.deepEqual(pick(/name/, source), {});
    assert.deepEqual(pick(Error, source), {});
  });

  it('should handle objects with a `.length` property', function() {
    var source = { name: 'tim', occupation: 'enchanter', scaredOf: 'rabbits', length: 100 };
    var expected = { name: 'tim', scaredOf: 'rabbits', length: 100 };

    assert.deepEqual(pick(['name', 'scaredOf', 'length'], source), expected);
  });

  it('should handle `null` and `undefined` as the `object` parameter', function() {
    assert.deepEqual(pick('whatever', null), {});
    assert.deepEqual(pick('whatever', undefined), {});
  });

  it('should return an empty object when passed a primitive value', function() {
    assert.deepEqual(pick('whatever', 'test'), {});
    assert.deepEqual(pick('whatever', 12), {});
    assert.deepEqual(pick('whatever', /regex/), {});
  });

  es5It('should not ignore non-enumerable properties', function() {
    var source = Object.create(null, {
      name: { value: 'tim', enumerable: true },
      occupation: { value: 'enchanter', enumerable: true },
      scaredOf: { value: 'rabbits', enumerable: false }
    });

    assert('scaredOf' in pick('scaredOf', source));
  });

  es5It('should not ignore inherited properties', function() {
    var parent = { parent: 'parent' };
    var child = Object.create(parent);
    child.child = 'child';
    child.color = 'green';

    assert('parent' in pick('parent', child));
  });
});
