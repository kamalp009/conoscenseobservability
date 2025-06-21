'use strict';

/**
 * Module dependencies.
 */

var assert = require('assert');
var includes = require('../');

/**
 * Detects and disables ES5-only tests in non-ES5 environments.
 */

var es5It = typeof Object.create === 'function' ? it : xit;

/**
 * Tests.
 */

describe('includes', function() {
  it('should be a function', function() {
    assert(typeof includes === 'function');
  });

  it('should have an arity of 2', function() {
    assert(includes.length === 2);
  });

  it('should work on arrays', function() {
    var numbers = [1, 2, 3];

    assert(includes(1, numbers) === true);
    assert(includes(2, numbers) === true);
    assert(includes(3, numbers) === true);
    assert(includes(0, numbers) === false);
  });

  it('should work on objects', function() {
    var person = { name: 'Bob', age: 23 };

    assert(includes(23, person) === true);
    assert(includes('Bob', person) === true);
    assert(includes('name', person) === false);
  });

  it('should work on strings', function() {
    var string = 'xyz for y o u';

    assert(includes('you', string) === false);
    assert(includes('or y', string) === true);
  });

  es5It('should ignore inherited properties', function() {
    var parent = { ignore: 'zyx' };
    var child = Object.create(parent);
    child.a = 'aaa';
    child.b = 'bbb';
    child.c = 'ccc';

    assert(includes('aaa', child) === true);
    assert(includes('bbb', child) === true);
    assert(includes('ccc', child) === true);
    assert(includes('zyx', child) === false);
  });

  es5It('should ignore non-enumerable properties', function() {
    var secrets = Object.create({}, {
      notSecret: { value: 'not a secret', enumerable: true },
      secret: { value: 'secret', enumerable: false }
    });

    assert(includes('not a secret', secrets) === true);
    assert(includes('secret', secrets) === false);
  });
});
