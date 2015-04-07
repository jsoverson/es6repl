/**
 * Copyright (c) 2014 zenparsing (Kevin Smith)

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do
 so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/*=esdown=*/
(function(fn, deps, name) {
  function obj() {
    return {}
  }
  if (typeof exports !== 'undefined') fn(require, exports, module);
  else if (typeof define === 'function' && define.amd) define(['require', 'exports', 'module'].concat(deps), fn);
  else if (typeof window !== 'undefined' && name) fn(obj, window[name] = {}, {});
  else fn(obj, {}, {});
})(function(require, exports, module) {
  'use strict';

  function __load(p, l) {
    module.__es6 = !l;
    var e = require(p);
    if (e && e.constructor !== Object) e.
      default = e;
    return e;
  }
  (function() {

    var VERSION = "0.9.6";

    function globalObject() {

      try {
        return global.global
      } catch (x) {}
      try {
        return window.window
      } catch (x) {}
      return null;
    }

    var arraySlice = Array.prototype.slice,
      hasOwn = Object.prototype.hasOwnProperty,
      staticName = /^__static_/,
      Global = globalObject();

    function toObject(val) {

      if (val == null) throw new TypeError(val + " is not an object");

      return Object(val);
    }

    // Returns true if the object has the specified property in
    // its prototype chain
    function has(obj, name) {

      for (; obj; obj = Object.getPrototypeOf(obj))
        if (hasOwn.call(obj, name)) return true;

      return false;
    }

    // Iterates over the descriptors for each own property of an object
    function forEachDesc(obj, fn) {

      var names = Object.getOwnPropertyNames(obj);

      for (var i$0 = 0; i$0 < names.length; ++i$0)
        fn(names[i$0], Object.getOwnPropertyDescriptor(obj, names[i$0]));

      names = Object.getOwnPropertySymbols(obj);

      for (var i$1 = 0; i$1 < names.length; ++i$1)
        fn(names[i$1], Object.getOwnPropertyDescriptor(obj, names[i$1]));

      return obj;
    }

    // Performs copy-based inheritance
    function inherit(to, from) {

      for (; from; from = Object.getPrototypeOf(from)) {

        forEachDesc(from, function(name, desc) {

          if (!has(to, name)) Object.defineProperty(to, name, desc);
        });
      }

      return to;
    }

    // Installs methods into an object, merging "get" and "set" functions
    function mergeMethods(from, to) {

      forEachDesc(from, function(name, desc) {

        if (desc.get || desc.set) {

          var prev$0 = Object.getOwnPropertyDescriptor(to, name);

          if (prev$0) {

            desc.get = desc.get || prev$0.get;
            desc.set = desc.set || prev$0.set;
          }
        }

        desc.enumerable = false;
        Object.defineProperty(to, name, desc);
      });
    }

    // Builds a class
    function buildClass(base, def) {

      var parent;

      if (def === void 0) {

        // If no base class is specified, then Object.prototype
        // is the parent prototype
        def = base;
        base = null;
        parent = Object.prototype;

      } else if (base === null) {

        // If the base is null, then then then the parent prototype is null
        parent = null;

      } else if (typeof base === "function") {

        parent = base.prototype;

        // Prototype must be null or an object
        if (parent !== null && Object(parent) !== parent) parent = void 0;
      }

      if (parent === void 0) throw new TypeError;

      // Create the prototype object
      var proto = Object.create(parent),
        statics = {},
        addMethods = function(obj) {
          return mergeMethods(obj, proto);
        },
        addStatics = function(obj) {
          return mergeMethods(obj, statics);
        };

      Object.assign(addMethods, {
        static: addStatics,
        super: parent,
        csuper: base || Function.prototype
      });

      // Generate method collections, closing over super bindings
      def(addMethods);

      if (!hasOwn.call(proto, "constructor")) throw new Error("No constructor specified");

      // Make constructor non-enumerable
      Object.defineProperty(proto, "constructor", {
        enumerable: false,
        writable: true,
        configurable: true
      });

      var ctor = proto.constructor;

      // Set constructor's prototype
      ctor.prototype = proto;

      // Set class "static" methods
      forEachDesc(statics, function(name, desc) {
        return Object.defineProperty(ctor, name, desc);
      });

      // "Inherit" from base constructor
      if (base) inherit(ctor, base);

      return ctor;
    }

    Global._esdown = {

      version: VERSION,

      global: Global,

      class: buildClass,

      // Support for iterator protocol
      iter: function(obj) {

        if (obj[Symbol.iterator] !== void 0) return obj[Symbol.iterator]();

        if (Array.isArray(obj)) return obj.values();

        return obj;
      },

      asyncIter: function(obj) {

        if (obj[Symbol.asyncIterator] !== void 0) return obj[Symbol.asyncIterator]();

        var iter = _esdown.computed({
            __$0: function() {
              return this
            }
          }, Symbol.asyncIterator),
          inner = _esdown.iter(obj);

        ["next", "throw", "return"].forEach(function(name) {

          if (name in inner) iter[name] = function(value) {
            return Promise.resolve(inner[name](value));
          };
        });

        return iter;
      },

      // Support for computed property names
      computed: function(obj) {

        var name, desc;

        for (var i$2 = 1; i$2 < arguments.length; ++i$2) {

          name = "__$" + (i$2 - 1);
          desc = Object.getOwnPropertyDescriptor(obj, name);

          if (!desc) continue;

          Object.defineProperty(obj, arguments[i$2], desc);
          delete obj[name];
        }

        return obj;
      },

      // Support for tagged templates
      callSite: function(values, raw) {

        values.raw = raw || values;
        return values;
      },

      // Support for async functions
      async: function(iter) {

        return new Promise(function(resolve, reject) {

          resume("next", void 0);

          function resume(type, value) {

            try {

              var result$0 = iter[type](value);

              if (result$0.done) {

                resolve(result$0.value);

              } else {

                Promise.resolve(result$0.value).then(

                  function(x) {
                    return resume("next", x);
                  },

                  function(x) {
                    return resume("throw", x);
                  });
              }

            } catch (x) {
              reject(x)
            }
          }
        });
      },

      // Support for async generators
      asyncGen: function(iter) {

        var front = null,
          back = null;

        return _esdown.computed({

          next: function(val) {
            return send("next", val)
          },
          throw : function(val) {
            return send("throw", val)
          },
          return : function(val) {
            return send("return", val)
          },
          __$0: function() {
            return this
          },
        }, Symbol.asyncIterator);

        function send(type, value) {

          return new Promise(function(resolve, reject) {

            var x = {
              type: type,
              value: value,
              resolve: resolve,
              reject: reject,
              next: null
            };

            if (back) {

              back = back.next = x;

            } else {

              front = back = x;
              resume(type, value);
            }
          });
        }

        function resume(type, value) {

          if (type === "return" && !(type in iter)) {

            // HACK: If the generator does not support the "return" method, then
            // emulate it (poorly) using throw.  (V8 circa 2015-02-13 does not support
            // generator.return.)
            type = "throw";
            value = {
              value: value,
              __return: true
            };
          }

          try {

            var result$1 = iter[type](value);

            value = result$1.value;

            if (typeof value === "object" && "_esdown_await" in value) {

              if (result$1.done) throw new Error("Invalid async generator return");

              Promise.resolve(value._esdown_await).then(

                function(x) {
                  return resume("next", x);
                },

                function(x) {
                  return resume("throw", x);
                });

              return;
            }

            front.resolve(result$1);

          } catch (x) {

            if (x && x.__return === true) {

              // HACK: Return-as-throw
              front.resolve({
                value: x.value,
                done: true
              });

            } else {

              front.reject(x);
            }
          }

          front = front.next;

          if (front) resume(front.type, front.value);
          else back = null;
        }
      },

      // Support for spread operations
      spread: function() {

        return {

          a: [],

          // Add items
          s: function() {

            for (var i$3 = 0; i$3 < arguments.length; ++i$3)
              this.a.push(arguments[i$3]);

            return this;
          },

          // Add the contents of iterables
          i: function(list) {

            if (Array.isArray(list)) {

              this.a.push.apply(this.a, list);

            } else {

              for (var __$0 = _esdown.iter(list), __$1; __$1 = __$0.next(), !__$1.done;) {
                var item$0 = __$1.value;
                this.a.push(item$0);
              }
            }

            return this;
          }

        };
      },

      // Support for object destructuring
      objd: function(obj) {

        return toObject(obj);
      },

      // Support for array destructuring
      arrayd: function(obj) {

        if (Array.isArray(obj)) {

          return {

            at: function(skip, pos) {
              return obj[pos]
            },
            rest: function(skip, pos) {
              return obj.slice(pos)
            }
          };
        }

        var iter = _esdown.iter(toObject(obj));

        return {

          at: function(skip) {

            var r;

            while (skip--)
              r = iter.next();

            return r.value;
          },

          rest: function(skip) {

            var a = [],
              r;

            while (--skip)
              r = iter.next();

            while (r = iter.next(), !r.done)
              a.push(r.value);

            return a;
          }
        };
      },

      // Support for private fields
      getPrivate: function(obj, key) {

        if (!key.has(Object(obj))) throw new TypeError;

        return key.get(obj);
      },

      setPrivate: function(obj, key, value) {

        if (!key.has(Object(obj))) throw new TypeError;

        return key.set(obj, value);
      }

    };


  }).call(this);

  (function() {

    // === Polyfill Utilities ===

    function eachKey(obj, fn) {

      var keys = Object.getOwnPropertyNames(obj);

      for (var i$4 = 0; i$4 < keys.length; ++i$4)
        fn(keys[i$4]);

      if (!Object.getOwnPropertySymbols) return;

      keys = Object.getOwnPropertySymbols(obj);

      for (var i$5 = 0; i$5 < keys.length; ++i$5)
        fn(keys[i$5]);
    }

    function polyfill(obj, methods) {

      eachKey(methods, function(key) {

        if (key in obj) return;

        Object.defineProperty(obj, key, {

          value: methods[key],
          configurable: true,
          enumerable: false,
          writable: true
        });

      });
    }


    // === Spec Helpers ===

    var sign = Math.sign || function(val) {

        var n = +val;

        if (n === 0 || Number.isNaN(n)) return n;

        return n < 0 ? -1 : 1;
      };

    function toInteger(val) {

      var n = +val;

      return n !== n /* n is NaN */
        ? 0 : (n === 0 || !isFinite(n)) ? n : sign(n) * Math.floor(Math.abs(n));
    }

    function toLength(val) {

      var n = toInteger(val);
      return n < 0 ? 0 : Math.min(n, Number.MAX_SAFE_INTEGER);
    }

    function sameValue(left, right) {

      if (left === right) return left !== 0 || 1 / left === 1 / right;

      return left !== left && right !== right;
    }

    function isRegExp(val) {

      return Object.prototype.toString.call(val) == "[object RegExp]";
    }

    function toObject(val) {

      if (val == null) throw new TypeError(val + " is not an object");

      return Object(val);
    }

    function iteratorMethod(obj) {

      // TODO:  What about typeof === "string"?
      if (!obj || typeof obj !== "object") return null;

      var m = obj[Symbol.iterator];

      // Generator iterators in Node 0.11.13 do not have a [Symbol.iterator] method
      if (!m && typeof obj.next === "function" && typeof obj.
          throw ==="function") return function() {
        return this
      };

      return m;
    }

    function assertThis(val, name) {

      if (val == null) throw new TypeError(name + " called on null or undefined");
    }

    // === Symbols ===

    var symbolCounter = 0,
      global = _esdown.global;

    function fakeSymbol() {

      return "__$" + Math.floor(Math.random() * 1e9) + "$" + (++symbolCounter) + "$__";
    }

    if (!global.Symbol) global.Symbol = fakeSymbol;

    polyfill(Symbol, {

      iterator: Symbol("iterator"),

      // Experimental async iterator support
      asyncIterator: Symbol("asyncIterator"),

      // Experimental async observation support
      observe: Symbol("observe")

    });

    // === Object ===

    polyfill(Object, {

      is: sameValue,

      assign: function(target, source) {

        target = toObject(target);

        for (var i$6 = 1; i$6 < arguments.length; ++i$6) {

          source = arguments[i$6];

          if (source != null) // null or undefined
            Object.keys(source).forEach(function(key) {
              return target[key] = source[key];
            });
        }

        return target;
      },

      setPrototypeOf: function(object, proto) {

        // Least effort attempt
        object.__proto__ = proto;
      },

      getOwnPropertySymbols: function() {

        // If getOwnPropertySymbols is not supported, then just return an
        // empty array so that we can avoid feature testing
      }

    });

    // === Number ===

    function isInteger(val) {

      return typeof val === "number" && isFinite(val) && toInteger(val) === val;
    }

    function epsilon() {

      // Calculate the difference between 1 and the smallest value greater than 1 that
      // is representable as a Number value

      var result;

      for (var next$0 = 1; 1 + next$0 !== 1; next$0 = next$0 / 2)
        result = next$0;

      return result;
    }

    polyfill(Number, {

      EPSILON: epsilon(),
      MAX_SAFE_INTEGER: 9007199254740991,
      MIN_SAFE_INTEGER: -9007199254740991,

      parseInt: parseInt,
      parseFloat: parseFloat,
      isInteger: isInteger,
      isFinite: function(val) {
        return typeof val === "number" && isFinite(val)
      },
      isNaN: function(val) {
        return val !== val
      },
      isSafeInteger: function(val) {
        return isInteger(val) && Math.abs(val) <= Number.MAX_SAFE_INTEGER
      }

    });

    // === String ===

    polyfill(String, {

      raw: function(callsite) {
        for (var args = [], __$0 = 1; __$0 < arguments.length; ++__$0) args.push(arguments[__$0]);

        var raw = callsite.raw,
          len = toLength(raw.length);

        if (len === 0) return "";

        var s = "",
          i = 0;

        while (true) {

          s += raw[i];
          if (i + 1 === len || i >= args.length) break;
          s += args[i++];
        }

        return s;
      },

      fromCodePoint: function() {
        for (var points = [], __$0 = 0; __$0 < arguments.length; ++__$0) points.push(arguments[__$0]);

        var out = [];

        points.forEach(function(next) {

          next = Number(next);

          if (!sameValue(next, toInteger(next)) || next < 0 || next > 0x10ffff) throw new RangeError("Invalid code point " + next);

          if (next < 0x10000) {

            out.push(String.fromCharCode(next));

          } else {

            next -= 0x10000;
            out.push(String.fromCharCode((next >> 10) + 0xD800));
            out.push(String.fromCharCode((next % 0x400) + 0xDC00));
          }
        });

        return out.join("");
      }

    });

    // Repeat a string by "squaring"
    function repeat(s, n) {

      if (n < 1) return "";
      if (n % 2) return repeat(s, n - 1) + s;
      var half = repeat(s, n / 2);
      return half + half;
    }

    var StringIterator = _esdown.class(function(__) {

      __({
        constructor: function StringIterator(string) {

          this.string = string;
          this.current = 0;
        }
      });

      __({
        next: function() {

          var s = this.string,
            i = this.current,
            len = s.length;

          if (i >= len) {

            this.current = Infinity;
            return {
              value: void 0,
              done: true
            };
          }

          var c = s.charCodeAt(i),
            chars = 1;

          if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {

            c = s.charCodeAt(i + 1);
            chars = (c < 0xDC00 || c > 0xDFFF) ? 1 : 2;
          }

          this.current += chars;

          return {
            value: s.slice(i, this.current),
            done: false
          };
        }
      });

      __(_esdown.computed({
        __$0: function() {
          return this
        }
      }, Symbol.iterator));

    });

    polyfill(String.prototype, _esdown.computed({

      repeat: function(count) {

        assertThis(this, "String.prototype.repeat");

        var string = String(this);

        count = toInteger(count);

        if (count < 0 || count === Infinity) throw new RangeError("Invalid count value");

        return repeat(string, count);
      },

      startsWith: function(search) {

        assertThis(this, "String.prototype.startsWith");

        if (isRegExp(search)) throw new TypeError("First argument to String.prototype.startsWith must not be a regular expression");

        var string = String(this);

        search = String(search);

        var pos = arguments.length > 1 ? arguments[1] : undefined,
          start = Math.max(toInteger(pos), 0);

        return string.slice(start, start + search.length) === search;
      },

      endsWith: function(search) {

        assertThis(this, "String.prototype.endsWith");

        if (isRegExp(search)) throw new TypeError("First argument to String.prototype.endsWith must not be a regular expression");

        var string = String(this);

        search = String(search);

        var len = string.length,
          arg = arguments.length > 1 ? arguments[1] : undefined,
          pos = arg === undefined ? len : toInteger(arg),
          end = Math.min(Math.max(pos, 0), len);

        return string.slice(end - search.length, end) === search;
      },

      contains: function(search) {

        assertThis(this, "String.prototype.contains");

        var string = String(this),
          pos = arguments.length > 1 ? arguments[1] : undefined;

        // Somehow this trick makes method 100% compat with the spec
        return string.indexOf(search, pos) !== -1;
      },

      codePointAt: function(pos) {

        assertThis(this, "String.prototype.codePointAt");

        var string = String(this),
          len = string.length;

        pos = toInteger(pos);

        if (pos < 0 || pos >= len) return undefined;

        var a = string.charCodeAt(pos);

        if (a < 0xD800 || a > 0xDBFF || pos + 1 === len) return a;

        var b = string.charCodeAt(pos + 1);

        if (b < 0xDC00 || b > 0xDFFF) return a;

        return ((a - 0xD800) * 1024) + (b - 0xDC00) + 0x10000;
      },

      __$0: function() {

        assertThis(this, "String.prototype[Symbol.iterator]");
        return new StringIterator(this);
      }

    }, Symbol.iterator));

    // === Array ===

    var ArrayIterator = _esdown.class(function(__) {

      __({
        constructor: function ArrayIterator(array, kind) {

          this.array = array;
          this.current = 0;
          this.kind = kind;
        }
      });

      __({
        next: function() {

          var length = toLength(this.array.length),
            index = this.current;

          if (index >= length) {

            this.current = Infinity;
            return {
              value: void 0,
              done: true
            };
          }

          this.current += 1;

          switch (this.kind) {

            case "values":
              return {
                value: this.array[index],
                done: false
              };

            case "entries":
              return {
                value: [index, this.array[index]],
                done: false
              };

            default:
              return {
                value: index,
                done: false
              };
          }
        }
      });

      __(_esdown.computed({
        __$0: function() {
          return this
        }
      }, Symbol.iterator));

    });

    polyfill(Array, {

      from: function(list) {

        list = toObject(list);

        var ctor = typeof this === "function" ? this : Array, // TODO: Always use "this"?
          map = arguments[1],
          thisArg = arguments[2],
          i = 0,
          out;

        if (map !== void 0 && typeof map !== "function") throw new TypeError(map + " is not a function");

        var getIter = iteratorMethod(list);

        if (getIter) {

          var iter$0 = getIter.call(list),
            result$2;

          out = new ctor;

          while (result$2 = iter$0.next(), !result$2.done) {

            out[i++] = map ? map.call(thisArg, result$2.value, i) : result$2.value;
            out.length = i;
          }

        } else {

          var len$0 = toLength(list.length);

          out = new ctor(len$0);

          for (; i < len$0; ++i)
            out[i] = map ? map.call(thisArg, list[i], i) : list[i];

          out.length = len$0;
        }

        return out;
      },

      of: function() {
        for (var items = [], __$0 = 0; __$0 < arguments.length; ++__$0) items.push(arguments[__$0]);

        var ctor = typeof this === "function" ? this : Array; // TODO: Always use "this"?

        if (ctor === Array) return items;

        var len = items.length,
          out = new ctor(len);

        for (var i$7 = 0; i$7 < len; ++i$7)
          out[i$7] = items[i$7];

        out.length = len;

        return out;
      }

    });

    function arrayFind(obj, pred, thisArg, type) {

      var len = toLength(obj.length),
        val;

      if (typeof pred !== "function") throw new TypeError(pred + " is not a function");

      for (var i$8 = 0; i$8 < len; ++i$8) {

        val = obj[i$8];

        if (pred.call(thisArg, val, i$8, obj)) return type === "value" ? val : i$8;
      }

      return type === "value" ? void 0 : -1;
    }

    polyfill(Array.prototype, _esdown.computed({

      copyWithin: function(target, start) {

        var obj = toObject(this),
          len = toLength(obj.length),
          end = arguments[2];

        target = toInteger(target);
        start = toInteger(start);

        var to = target < 0 ? Math.max(len + target, 0) : Math.min(target, len),
          from = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);

        end = end !== void 0 ? toInteger(end) : len;
        end = end < 0 ? Math.max(len + end, 0) : Math.min(end, len);

        var count = Math.min(end - from, len - to),
          dir = 1;

        if (from < to && to < from + count) {

          dir = -1;
          from += count - 1;
          to += count - 1;
        }

        for (; count > 0; --count) {

          if (from in obj) obj[to] = obj[from];
          else delete obj[to];

          from += dir;
          to += dir;
        }

        return obj;
      },

      fill: function(value) {

        var obj = toObject(this),
          len = toLength(obj.length),
          start = toInteger(arguments[1]),
          pos = start < 0 ? Math.max(len + start, 0) : Math.min(start, len),
          end = arguments.length > 2 ? toInteger(arguments[2]) : len;

        end = end < 0 ? Math.max(len + end, 0) : Math.min(end, len);

        for (; pos < end; ++pos)
          obj[pos] = value;

        return obj;
      },

      find: function(pred) {

        return arrayFind(toObject(this), pred, arguments[1], "value");
      },

      findIndex: function(pred) {

        return arrayFind(toObject(this), pred, arguments[1], "index");
      },

      values: function() {
        return new ArrayIterator(this, "values")
      },

      entries: function() {
        return new ArrayIterator(this, "entries")
      },

      keys: function() {
        return new ArrayIterator(this, "keys")
      },

      __$0: function() {
        return this.values()
      }

    }, Symbol.iterator));


  }).call(this);

  (function() {

    var global = _esdown.global,
      ORIGIN = {},
      REMOVED = {};

    var MapNode = _esdown.class(function(__) {

      __({
        constructor: function MapNode(key, val) {

          this.key = key;
          this.value = val;
          this.prev = this;
          this.next = this;
        }
      });

      __({
        insert: function(next) {

          this.next = next;
          this.prev = next.prev;
          this.prev.next = this;
          this.next.prev = this;
        }
      });

      __({
        remove: function() {

          this.prev.next = this.next;
          this.next.prev = this.prev;
          this.key = REMOVED;
        }
      });

    });

    var MapIterator = _esdown.class(function(__) {

      __({
        constructor: function MapIterator(node, kind) {

          this.current = node;
          this.kind = kind;
        }
      });

      __({
        next: function() {

          var node = this.current;

          while (node.key === REMOVED)
            node = this.current = this.current.next;

          if (node.key === ORIGIN) return {
            value: void 0,
            done: true
          };

          this.current = this.current.next;

          switch (this.kind) {

            case "values":
              return {
                value: node.value,
                done: false
              };

            case "entries":
              return {
                value: [node.key, node.value],
                done: false
              };

            default:
              return {
                value: node.key,
                done: false
              };
          }
        }
      });

      __(_esdown.computed({
        __$0: function() {
          return this
        }
      }, Symbol.iterator));
    });

    function hashKey(key) {

      switch (typeof key) {

        case "string":
          return "$" + key;
        case "number":
          return String(key);
      }

      throw new TypeError("Map and Set keys must be strings or numbers in esdown");
    }

    var Map = _esdown.class(function(__) {

      __({
        constructor: function Map() {

          if (arguments.length > 0) throw new Error("Arguments to Map constructor are not supported in esdown");

          this._index = {};
          this._origin = new MapNode(ORIGIN);
        }
      });

      __({
        clear: function() {

          for (var node$0 = this._origin.next; node$0 !== this._origin; node$0 = node$0.next)
            node$0.key = REMOVED;

          this._index = {};
          this._origin = new MapNode(ORIGIN);
        }
      });

      __({
        delete: function(key) {

          var h = hashKey(key),
            node = this._index[h];

          if (node) {

            node.remove();
            delete this._index[h];
            return true;
          }

          return false;
        }
      });

      __({
        forEach: function(fn) {

          var thisArg = arguments[1];

          if (typeof fn !== "function") throw new TypeError(fn + " is not a function");

          for (var node$1 = this._origin.next; node$1.key !== ORIGIN; node$1 = node$1.next)
            if (node$1.key !== REMOVED) fn.call(thisArg, node$1.value, node$1.key, this);
        }
      });

      __({
        get: function(key) {

          var h = hashKey(key),
            node = this._index[h];

          return node ? node.value : void 0;
        }
      });

      __({
        has: function(key) {

          return hashKey(key) in this._index;
        }
      });

      __({
        set: function(key, val) {

          var h = hashKey(key),
            node = this._index[h];

          if (node) {

            node.value = val;
            return;
          }

          node = new MapNode(key, val);

          this._index[h] = node;
          node.insert(this._origin);
        }
      });

      __({
        get size() {

          return Object.keys(this._index).length;
        }
      });

      __({
        keys: function() {
          return new MapIterator(this._origin.next, "keys")
        }
      });
      __({
        values: function() {
          return new MapIterator(this._origin.next, "values")
        }
      });
      __({
        entries: function() {
          return new MapIterator(this._origin.next, "entries")
        }
      });

      __(_esdown.computed({
        __$0: function() {
          return new MapIterator(this._origin.next, "entries")
        }
      }, Symbol.iterator));

    });

    var mapSet = Map.prototype.set;

    var Set = _esdown.class(function(__) {

      __({
        constructor: function Set() {

          if (arguments.length > 0) throw new Error("Arguments to Set constructor are not supported in esdown");

          this._index = {};
          this._origin = new MapNode(ORIGIN);
        }
      });

      __({
        add: function(key) {
          return mapSet.call(this, key, key)
        }
      });

      __(_esdown.computed({
        __$0: function() {
          return new MapIterator(this._origin.next, "entries")
        }
      }, Symbol.iterator));

    });

    // Copy shared prototype members to Set
    ["clear", "delete", "forEach", "has", "size", "keys", "values", "entries"].forEach(function(k) {

      var d = Object.getOwnPropertyDescriptor(Map.prototype, k);
      Object.defineProperty(Set.prototype, k, d);
    });

    if (!global.Map || !global.Map.prototype.entries) {

      global.Map = Map;
      global.Set = Set;
    }


  }).call(this);

  (function() {

    (function() {
      "use strict";

      // Find global variable and exit if Promise is defined on it

      var Global = (function() {
        if (typeof window !== "undefined" && window && window.window === window) return window;
        if (typeof global !== "undefined" && global && global.global === global) return global;
        throw new Error("Unable to determine global object");
      })();

      if (typeof Global.Promise === "function") return;

      // Create an efficient microtask queueing mechanism

      var runLater = (function() {
        // Node
        if (Global.process && typeof process.version === "string") {
          return Global.setImmediate ? function(fn) {
            setImmediate(fn);
          } : function(fn) {
            process.nextTick(fn);
          };
        }

        // Newish Browsers
        var Observer = Global.MutationObserver || Global.WebKitMutationObserver;

        if (Observer) {
          var div = document.createElement("div"),
            queuedFn = void 0;

          var observer = new Observer(function() {
            var fn = queuedFn;
            queuedFn = void 0;
            fn();
          });

          observer.observe(div, {
            attributes: true
          });

          return function(fn) {
            if (queuedFn !== void 0) throw new Error("Only one function can be queued at a time");
            queuedFn = fn;
            div.classList.toggle("x");
          };
        }

        // Fallback
        return function(fn) {
          setTimeout(fn, 0);
        };
      })();

      var EnqueueMicrotask = (function() {
        var queue = null;

        function flush() {
          var q = queue;
          queue = null;
          for (var i = 0; i < q.length; ++i)
            q[i]();
        }

        return function PromiseEnqueueMicrotask(fn) {
          // fn must not throw
          if (!queue) {
            queue = [];
            runLater(flush);
          }
          queue.push(fn);
        };
      })();

      // Mock V8 internal functions and vars

      function SET_PRIVATE(obj, prop, val) {
        obj[prop] = val;
      }

      function GET_PRIVATE(obj, prop) {
        return obj[prop];
      }

      function IS_SPEC_FUNCTION(obj) {
        return typeof obj === "function";
      }

      function IS_SPEC_OBJECT(obj) {
        return obj === Object(obj);
      }

      function HAS_DEFINED_PRIVATE(obj, prop) {
        return prop in obj;
      }

      function IS_UNDEFINED(x) {
        return x === void 0;
      }

      function MakeTypeError(msg) {
        return new TypeError(msg);
      }

      // In IE8 Object.defineProperty only works on DOM nodes, and defineProperties does not exist
      var _defineProperty = Object.defineProperties && Object.defineProperty;

      function AddNamedProperty(target, name, value) {
        if (!_defineProperty) {
          target[name] = value;
          return;
        }

        _defineProperty(target, name, {
          configurable: true,
          writable: true,
          enumerable: false,
          value: value
        });
      }

      function InstallFunctions(target, attr, list) {
        for (var i = 0; i < list.length; i += 2)
          AddNamedProperty(target, list[i], list[i + 1]);
      }

      var IsArray = Array.isArray || (function(obj) {
          var str = Object.prototype.toString;
          return function(obj) {
            return str.call(obj) === "[object Array]"
          };
        })();

      var UNDEFINED, DONT_ENUM, InternalArray = Array;

      // V8 Implementation

      var IsPromise;
      var PromiseCreate;
      var PromiseResolve;
      var PromiseReject;
      var PromiseChain;
      var PromiseCatch;
      var PromiseThen;

      // Status values: 0 = pending, +1 = resolved, -1 = rejected
      var promiseStatus = "Promise#status";
      var promiseValue = "Promise#value";
      var promiseOnResolve = "Promise#onResolve";
      var promiseOnReject = "Promise#onReject";
      var promiseRaw = {};
      var promiseHasHandler = "Promise#hasHandler";
      var lastMicrotaskId = 0;

      var $Promise = function Promise(resolver) {
        if (resolver === promiseRaw) return;
        if (!IS_SPEC_FUNCTION(resolver)) throw MakeTypeError('resolver_not_a_function', [resolver]);
        var promise = PromiseInit(this);
        try {
          resolver(function(x) {
              PromiseResolve(promise, x)
            },

            function(r) {
              PromiseReject(promise, r)
            });
        } catch (e) {
          PromiseReject(promise, e);
        }
      }

      // Core functionality.

      function PromiseSet(promise, status, value, onResolve, onReject) {
        SET_PRIVATE(promise, promiseStatus, status);
        SET_PRIVATE(promise, promiseValue, value);
        SET_PRIVATE(promise, promiseOnResolve, onResolve);
        SET_PRIVATE(promise, promiseOnReject, onReject);
        return promise;
      }

      function PromiseInit(promise) {
        return PromiseSet(promise, 0, UNDEFINED, new InternalArray, new InternalArray);
      }

      function PromiseDone(promise, status, value, promiseQueue) {
        if (GET_PRIVATE(promise, promiseStatus) === 0) {
          PromiseEnqueue(value, GET_PRIVATE(promise, promiseQueue), status);
          PromiseSet(promise, status, value);
        }
      }

      function PromiseCoerce(constructor, x) {
        if (!IsPromise(x) && IS_SPEC_OBJECT(x)) {
          var then;
          try {
            then = x.then;
          } catch (r) {
            return PromiseRejected.call(constructor, r);
          }
          if (IS_SPEC_FUNCTION(then)) {
            var deferred = PromiseDeferred.call(constructor);
            try {
              then.call(x, deferred.resolve, deferred.reject);
            } catch (r) {
              deferred.reject(r);
            }
            return deferred.promise;
          }
        }
        return x;
      }

      function PromiseHandle(value, handler, deferred) {
        try {
          var result = handler(value);
          if (result === deferred.promise) throw MakeTypeError('promise_cyclic', [result]);
          else if (IsPromise(result)) PromiseChain.call(result, deferred.resolve, deferred.reject);
          else deferred.resolve(result);
        } catch (exception) {
          try {
            deferred.reject(exception)
          } catch (e) {}
        }
      }

      function PromiseEnqueue(value, tasks, status) {
        EnqueueMicrotask(function() {
          for (var i = 0; i < tasks.length; i += 2)
            PromiseHandle(value, tasks[i], tasks[i + 1]);
        });
      }

      function PromiseIdResolveHandler(x) {
        return x
      }

      function PromiseIdRejectHandler(r) {
        throw r
      }

      function PromiseNopResolver() {}

      // -------------------------------------------------------------------
      // Define exported functions.

      // For bootstrapper.

      IsPromise = function IsPromise(x) {
        return IS_SPEC_OBJECT(x) && HAS_DEFINED_PRIVATE(x, promiseStatus);
      };

      PromiseCreate = function PromiseCreate() {
        return new $Promise(PromiseNopResolver);
      };

      PromiseResolve = function PromiseResolve(promise, x) {
        PromiseDone(promise, + 1, x, promiseOnResolve);
      };

      PromiseReject = function PromiseReject(promise, r) {
        PromiseDone(promise, - 1, r, promiseOnReject);
      };

      // Convenience.

      function PromiseDeferred() {
        if (this === $Promise) {
          // Optimized case, avoid extra closure.
          var promise = PromiseInit(new $Promise(promiseRaw));
          return {
            promise: promise,
            resolve: function(x) {
              PromiseResolve(promise, x)
            },
            reject: function(r) {
              PromiseReject(promise, r)
            }
          };
        } else {
          var result = {};
          result.promise = new this(function(resolve, reject) {
            result.resolve = resolve;
            result.reject = reject;
          });
          return result;
        }
      }

      function PromiseResolved(x) {
        if (this === $Promise) {
          // Optimized case, avoid extra closure.
          return PromiseSet(new $Promise(promiseRaw), + 1, x);
        } else {
          return new this(function(resolve, reject) {
            resolve(x)
          });
        }
      }

      function PromiseRejected(r) {
        var promise;
        if (this === $Promise) {
          // Optimized case, avoid extra closure.
          promise = PromiseSet(new $Promise(promiseRaw), - 1, r);
        } else {
          promise = new this(function(resolve, reject) {
            reject(r)
          });
        }
        return promise;
      }

      // Simple chaining.

      PromiseChain = function PromiseChain(onResolve, onReject) {
        onResolve = IS_UNDEFINED(onResolve) ? PromiseIdResolveHandler : onResolve;
        onReject = IS_UNDEFINED(onReject) ? PromiseIdRejectHandler : onReject;
        var deferred = PromiseDeferred.call(this.constructor);
        switch (GET_PRIVATE(this, promiseStatus)) {
          case UNDEFINED:
            throw MakeTypeError('not_a_promise', [this]);
          case 0:
            // Pending
            GET_PRIVATE(this, promiseOnResolve).push(onResolve, deferred);
            GET_PRIVATE(this, promiseOnReject).push(onReject, deferred);
            break;
          case +1:
            // Resolved
            PromiseEnqueue(GET_PRIVATE(this, promiseValue), [onResolve, deferred], + 1);
            break;
          case -1:
            // Rejected
            PromiseEnqueue(GET_PRIVATE(this, promiseValue), [onReject, deferred], - 1);
            break;
        }
        // Mark this promise as having handler.
        SET_PRIVATE(this, promiseHasHandler, true);
        return deferred.promise;
      }

      PromiseCatch = function PromiseCatch(onReject) {
        return this.then(UNDEFINED, onReject);
      }

      // Multi-unwrapped chaining with thenable coercion.

      PromiseThen = function PromiseThen(onResolve, onReject) {
        onResolve = IS_SPEC_FUNCTION(onResolve) ? onResolve : PromiseIdResolveHandler;
        onReject = IS_SPEC_FUNCTION(onReject) ? onReject : PromiseIdRejectHandler;
        var that = this;
        var constructor = this.constructor;
        return PromiseChain.call(
          this,

          function(x) {
            x = PromiseCoerce(constructor, x);
            return x === that ? onReject(MakeTypeError('promise_cyclic', [x])) : IsPromise(x) ? x.then(onResolve, onReject) : onResolve(x);
          },
          onReject);
      }

      // Combinators.

      function PromiseCast(x) {
        return IsPromise(x) ? x : new this(function(resolve) {
          resolve(x)
        });
      }

      function PromiseAll(values) {
        var deferred = PromiseDeferred.call(this);
        var resolutions = [];
        if (!IsArray(values)) {
          deferred.reject(MakeTypeError('invalid_argument'));
          return deferred.promise;
        }
        try {
          var count = values.length;
          if (count === 0) {
            deferred.resolve(resolutions);
          } else {
            for (var i = 0; i < values.length; ++i) {
              this.resolve(values[i]).then(
                (function() {
                  // Nested scope to get closure over current i (and avoid .bind).
                  var i_captured = i;
                  return function(x) {
                    resolutions[i_captured] = x;
                    if (--count === 0) deferred.resolve(resolutions);
                  };
                })(),

                function(r) {
                  deferred.reject(r)
                });
            }
          }
        } catch (e) {
          deferred.reject(e);
        }
        return deferred.promise;
      }

      function PromiseOne(values) {
        var deferred = PromiseDeferred.call(this);
        if (!IsArray(values)) {
          deferred.reject(MakeTypeError('invalid_argument'));
          return deferred.promise;
        }
        try {
          for (var i = 0; i < values.length; ++i) {
            this.resolve(values[i]).then(

              function(x) {
                deferred.resolve(x)
              },

              function(r) {
                deferred.reject(r)
              });
          }
        } catch (e) {
          deferred.reject(e);
        }
        return deferred.promise;
      }

      // -------------------------------------------------------------------
      // Install exported functions.

      AddNamedProperty(Global, 'Promise', $Promise, DONT_ENUM);

      InstallFunctions($Promise, DONT_ENUM, ["defer", PromiseDeferred, "accept", PromiseResolved, "reject", PromiseRejected, "all", PromiseAll, "race", PromiseOne, "resolve", PromiseCast]);

      InstallFunctions($Promise.prototype, DONT_ENUM, ["chain", PromiseChain, "then", PromiseThen, "catch", PromiseCatch]);

    })();


  }).call(this);

  (function() {

    var Observable = _esdown.class(function(__) {

      __({
        constructor: function Observable(start) {

          // The stream initializer must be a function
          if (typeof start !== "function") throw new TypeError("Observer definition is not a function");

          this._start = start;
        }
      });

      __({
        observe: function(sink) {

          if (typeof sink === "function") sink = {
            next: sink
          };

          // The sink must be an object
          if (Object(sink) !== sink) throw new TypeError("Sink is not an object");

          var start = this._start,
            finished = false,
            cleanup;

          // Wrap the provided sink
          sink = _wrapSink(sink, function(_) {

            finished = true;

            if (cleanup !== void 0) cleanup();
          });

          try {

            // Call the stream initializer.  The initializer will return a cleanup
            // function or undefined.
            cleanup = start.call(void 0, sink);

          } catch (e) {

            sink.
              throw (e);
          }

          // If the stream is already finished, then perform cleanup
          if (finished && cleanup !== void 0) cleanup();

          // Return a cancelation function
          return sink.
            return;
        }
      });

      /*

       Observer sinks are wrapped for the following reasons:

       - Ensures that the sink is not called after the stream is closed.
       - Ensures that the returned object has all three sink methods ("next", "throw", and "return").
       - Ensures that values are properly handled when the sink does not have "throw" or "return".
       - Ensures that returned methods can be called without a provided "this" value.
       - Ensures that cleanup is triggered when the stream is closed.

       */
      function _wrapSink(sink, cleanup) {

        var done = false;

        // Marks the stream as closed and triggers stream cleanup.  Exceptions
        // which occur during cleanup are propagated to the caller.
        function close() {

          if (!done) {

            done = true;
            cleanup();
          }
        }

        // Returns a "done" result
        function doneResult() {

          return {
            value: void 0,
            done: true
          };
        }

        // Sends a completion value to the sink
        function send(op, value) {

          // If the stream if closed, then return a "done" result
          if (done) return doneResult();

          var result;

          try {

            switch (op) {

              case "next":

                // Send the next value to the sink
                result = sink.next(value);
                break;

              case "throw":

                // If the sink does not support "throw", then throw value back to caller
                if (!("throw" in sink)) throw value;

                result = sink.
                  throw (value);
                break;

              case "return":

                // If the sink does not support "return", then close and return a done result
                if (!("return" in sink)) return close(), doneResult();

                result = sink.
                  return (value);

                // If the sink does not return a result, then assume that it is finished
                if (!result) result = doneResult();

                break;

            }

          } catch (e) {

            // If the sink throws, then close the stream and throw error to caller
            close();
            throw e;
          }

          // If the sink is finished receiving data, then close the stream
          if (result && result.done) close();

          return result;
        }

        return {
          next: function(value) {
            return send("next", value)
          },
          throw : function(value) {
            return send("throw", value)
          },
          return : function(value) {
            return send("return", value)
          },
        };
      }

      __(_esdown.computed({
        __$0: function() {
          return _esdown.asyncGen(function * () {

            var ready = [],
              pending = [];

            function send(x) {

              if (pending.length > 0) pending.shift()(x);
              else ready.push(x);
            }

            function next() {

              return ready.length > 0 ? ready.shift() : new Promise(function(resolve) {
                return pending.push(resolve);
              });
            }

            var cancel = this.observe({

              next: function(value) {
                send({
                  type: "next",
                  value: value
                })
              },
              throw : function(value) {
                send({
                  type: "throw",
                  value: value
                })
              },
              return : function(value) {
                send({
                  type: "return",
                  value: value
                })
              },
            });

            try {

              while (true) {

                var result$3 = (yield {
                  _esdown_await: (next())
                });

                if (result$3.type == "return") return result$3.value;
                else if (result$3.type === "throw") throw result$3.value;
                else yield result$3.value;
              }

            } finally {

              cancel();
            }
          }.apply(this, arguments));
        }
      }, Symbol.asyncIterator));

      __({
        forEach: function(fn) {
          var __this = this;

          return new Promise(function(resolve, reject) {

            __this.observe({

              next: fn,
              throw :reject,
              return :resolve,
            });
          });
        }
      });

      __({
        map: function(fn) {
          var __this = this;

          if (typeof fn !== "function") throw new TypeError("Callback is not a function");

          return new this.constructor(function(sink) {
            return __this.observe({

              next: function(value) {

                try {
                  value = fn(value)
                } catch (e) {
                  return sink.
                    throw (e)
                }

                return sink.next(value);
              },

              throw :sink.
                throw,
              return :sink.
                return,

            });
          });
        }
      });

    });


    if (!_esdown.global.Observable) _esdown.global.Observable = Observable;


  }).call(this);



  var _M2 = __load("fs", 1),
    _M3 = __load("path", 1),
    _M19 = {}, _M20 = {}, _M21 = {}, _M10 = {}, _M4 = {}, _M5 = {}, _M11 = __load("repl", 1),
    _M12 = __load("vm", 1),
    _M13 = __load("util", 1),
    _M28 = {}, _M24 = {}, _M31 = {}, _M29 = {}, _M30 = {}, _M25 = {}, _M26 = {}, _M27 = {}, _M22 = {}, _M23 = {}, _M18 = {}, _M9 = {}, _M17 = {}, _M16 = {}, _M15 = {}, _M8 = {}, _M14 = {}, _M6 = {}, _M7 = {}, _M1 = exports;

  (function(exports) {

    var HAS = Object.prototype.hasOwnProperty;

    function raise(x) {

      x.name = "CommandError";
      throw x;
    }

    function has(obj, name) {

      return HAS.call(obj, name);
    }

    function parse(argv, params) {

      if (!params) return argv.slice(0);

      var pos = Object.keys(params),
        values = {},
        shorts = {},
        required = [],
        list = [values];

      // Create short-to-long mapping
      pos.forEach(function(name) {

        var p = params[name];

        if (p.short) shorts[p.short] = name;

        if (p.required) required.push(name);
      });

      // For each command line arg...
      for (var i$0 = 0; i$0 < argv.length; ++i$0) {

        var a$0 = argv[i$0],
          param$0 = null,
          value$0 = null,
          name$0 = "";

        if (a$0[0] === "-") {

          if (a$0.slice(0, 2) === "--") {

            // Long named parameter
            name$0 = a$0.slice(2);
            param$0 = has(params, name$0) ? params[name$0] : null;

          } else {

            // Short named parameter
            name$0 = a$0.slice(1);
            name$0 = has(shorts, name$0) ? shorts[name$0] : "";
            param$0 = has(params, name$0) ? params[name$0] : null;
          }

          // Verify parameter exists
          if (!param$0) raise(new Error("Invalid command line option: " + a$0));

          if (param$0.flag) {

            value$0 = true;

          } else {

            // Get parameter value
            value$0 = argv[++i$0] || "";

            if (typeof value$0 !== "string" || value$0[0] === "-") raise(new Error("No value provided for option " + a$0));
          }

        } else {

          // Positional parameter
          do {

            name$0 = pos.length > 0 ? pos.shift() : "";
            param$0 = name$0 ? params[name$0] : null;

          } while (param$0 && !param$0.positional);;

          value$0 = a$0;
        }

        if (param$0) values[name$0] = value$0;
        else list.push(value$0);
      }

      required.forEach(function(name) {

        if (values[name] === void 0) raise(new Error("Missing required option: --" + name));
      });

      return list;
    }

    var ConsoleCommand = _esdown.class(function(__) {

      __({
        constructor: function ConsoleCommand(cmd) {

          this.fallback = cmd;
          this.commands = {};
        }
      });

      __({
        add: function(name, cmd) {

          this.commands[name] = cmd;
          return this;
        }
      });

      __({
        run: function(args) {

          // Peel off the "node" and main module args
          args || (args = process.argv.slice(2));

          var name = args[0] || "",
            cmd = this.fallback;

          if (name && has(this.commands, name)) {

            cmd = this.commands[name];
            args = args.slice(1);
          }

          if (!cmd) raise(new Error("Invalid command"));

          return cmd.execute.apply(cmd, parse(args, cmd.params));
        }
      });

    });

    exports.ConsoleCommand = ConsoleCommand;


  }).call(this, _M19);

  (function(exports) {


    var ConsoleIO = _esdown.class(function(__) {

      __({
        constructor: function ConsoleIO() {

          this._inStream = process.stdin;
          this._outStream = process.stdout;

          this._outEnc = "utf8";
          this._inEnc = "utf8";

          this.inputEncoding = "utf8";
          this.outputEncoding = "utf8";
        }
      });

      __({
        get inputEncoding() {

          return this._inEnc;
        }
      });

      __({
        set inputEncoding(enc) {

          this._inStream.setEncoding(this._inEnc = enc);
        }
      });

      __({
        get outputEncoding() {

          return this._outEnc;
        }
      });

      __({
        set outputEncoding(enc) {

          this._outStream.setEncoding(this._outEnc = enc);
        }
      });

      __({
        readLine: function() {
          var __this = this;

          return new Promise(function(resolve) {

            var listener;

            listener = function(data) {

              resolve(data);
              __this._inStream.removeListener("data", listener);
              __this._inStream.pause();
            };

            __this._inStream.resume();
            __this._inStream.on("data", listener);
          });
        }
      });

      __({
        writeLine: function(msg) {

          console.log(msg);
        }
      });

      __({
        write: function(msg) {

          process.stdout.write(msg);
        }
      });

    });

    exports.ConsoleIO = ConsoleIO;


  }).call(this, _M20);

  (function(exports) {

    var ConsoleStyle = {

      green: function(msg) {
        return "\x1B[32m" + (msg) + "\x1B[39m"
      },

      red: function(msg) {
        return "\x1B[31m" + (msg) + "\x1B[39m"
      },

      gray: function(msg) {
        return "\x1B[90m" + (msg) + "\x1B[39m"
      },

      bold: function(msg) {
        return "\x1B[1m" + (msg) + "\x1B[22m"
      },

    };

    exports.ConsoleStyle = ConsoleStyle;


  }).call(this, _M21);

  (function(exports) {

    Object.keys(_M19).forEach(function(k) {
      exports[k] = _M19[k];
    });
    Object.keys(_M20).forEach(function(k) {
      exports[k] = _M20[k];
    });
    Object.keys(_M21).forEach(function(k) {
      exports[k] = _M21[k];
    });


  }).call(this, _M10);

  (function(exports) {

    Object.keys(_M10).forEach(function(k) {
      exports[k] = _M10[k];
    });


  }).call(this, _M4);

  (function(exports) {

    var FS = _M2;

    // Wraps a standard Node async function with a promise
    // generating function
    function wrap(fn) {

      return function() {
        for (var args = [], __$0 = 0; __$0 < arguments.length; ++__$0) args.push(arguments[__$0]);

        return new Promise(function(resolve, reject) {

          args.push(function(err, data) {

            if (err) reject(err);
            else resolve(data);
          });

          fn.apply(null, args);
        });
      };
    }

    function exists(path) {

      return new Promise(function(resolve) {

        FS.exists(path, function(result) {
          return resolve(result);
        });
      });
    }

    var
      readFile = wrap(FS.readFile),
      close = wrap(FS.close),
      open = wrap(FS.open),
      read = wrap(FS.read),
      write = wrap(FS.write),
      rename = wrap(FS.rename),
      truncate = wrap(FS.truncate),
      rmdir = wrap(FS.rmdir),
      fsync = wrap(FS.fsync),
      mkdir = wrap(FS.mkdir),
      sendfile = wrap(FS.sendfile),
      readdir = wrap(FS.readdir),
      fstat = wrap(FS.fstat),
      lstat = wrap(FS.lstat),
      stat = wrap(FS.stat),
      readlink = wrap(FS.readlink),
      symlink = wrap(FS.symlink),
      link = wrap(FS.link),
      unlink = wrap(FS.unlink),
      fchmod = wrap(FS.fchmod),
      lchmod = wrap(FS.lchmod),
      chmod = wrap(FS.chmod),
      lchown = wrap(FS.lchown),
      fchown = wrap(FS.fchown),
      chown = wrap(FS.chown),
      utimes = wrap(FS.utimes),
      futimes = wrap(FS.futimes),
      writeFile = wrap(FS.writeFile),
      appendFile = wrap(FS.appendFile),
      realpath = wrap(FS.realpath);

    exports.exists = exists;
    exports.readFile = readFile;
    exports.close = close;
    exports.open = open;
    exports.read = read;
    exports.write = write;
    exports.rename = rename;
    exports.truncate = truncate;
    exports.rmdir = rmdir;
    exports.fsync = fsync;
    exports.mkdir = mkdir;
    exports.sendfile = sendfile;
    exports.readdir = readdir;
    exports.fstat = fstat;
    exports.lstat = lstat;
    exports.stat = stat;
    exports.readlink = readlink;
    exports.symlink = symlink;
    exports.link = link;
    exports.unlink = unlink;
    exports.fchmod = fchmod;
    exports.lchmod = lchmod;
    exports.chmod = chmod;
    exports.lchown = lchown;
    exports.fchown = fchown;
    exports.chown = chown;
    exports.utimes = utimes;
    exports.futimes = futimes;
    exports.writeFile = writeFile;
    exports.appendFile = appendFile;
    exports.realpath = realpath;


  }).call(this, _M5);

  (function(exports) {

    function Node(type, start, end) {

      this.type = type;
      this.start = start;
      this.end = end;
    }

    function Identifier(value, context, start, end) {

      this.type = "Identifier";
      this.start = start;
      this.end = end;
      this.value = value;
      this.context = context;
    }

    function AtName(value, start, end) {

      this.type = "AtName";
      this.start = start;
      this.end = end;
      this.value = value;
    }

    function NumberLiteral(value, start, end) {

      this.type = "NumberLiteral";
      this.start = start;
      this.end = end;
      this.value = value;
    }

    function StringLiteral(value, start, end) {

      this.type = "StringLiteral";
      this.start = start;
      this.end = end;
      this.value = value;
    }

    function TemplatePart(value, raw, isEnd, start, end) {

      this.type = "TemplatePart";
      this.start = start;
      this.end = end;
      this.value = value;
      this.raw = raw;
      this.templateEnd = isEnd;
    }

    function RegularExpression(value, flags, start, end) {

      this.type = "RegularExpression";
      this.start = start;
      this.end = end;
      this.value = value;
      this.flags = flags;
    }

    function BooleanLiteral(value, start, end) {

      this.type = "BooleanLiteral";
      this.start = start;
      this.end = end;
      this.value = value;
    }

    function NullLiteral(start, end) {

      this.type = "NullLiteral";
      this.start = start;
      this.end = end;
    }

    function Script(statements, start, end) {

      this.type = "Script";
      this.start = start;
      this.end = end;
      this.statements = statements;
    }

    function Module(statements, start, end) {

      this.type = "Module";
      this.start = start;
      this.end = end;
      this.statements = statements;
    }

    function ThisExpression(start, end) {

      this.type = "ThisExpression";
      this.start = start;
      this.end = end;
    }

    function SuperKeyword(start, end) {

      this.type = "SuperKeyword";
      this.start = start;
      this.end = end;
    }

    function SequenceExpression(list, start, end) {

      this.type = "SequenceExpression";
      this.start = start;
      this.end = end;
      this.expressions = list;
    }

    function AssignmentExpression(op, left, right, start, end) {

      this.type = "AssignmentExpression";
      this.start = start;
      this.end = end;
      this.operator = op;
      this.left = left;
      this.right = right;
    }

    function SpreadExpression(expr, start, end) {

      this.type = "SpreadExpression";
      this.start = start;
      this.end = end;
      this.expression = expr;
    }

    function YieldExpression(expr, delegate, start, end) {

      this.type = "YieldExpression";
      this.start = start;
      this.end = end;
      this.delegate = delegate;
      this.expression = expr;
    }

    function ConditionalExpression(test, cons, alt, start, end) {

      this.type = "ConditionalExpression";
      this.start = start;
      this.end = end;
      this.test = test;
      this.consequent = cons;
      this.alternate = alt;
    }

    function BinaryExpression(op, left, right, start, end) {

      this.type = "BinaryExpression";
      this.start = start;
      this.end = end;
      this.operator = op;
      this.left = left;
      this.right = right;
    }

    function UpdateExpression(op, expr, prefix, start, end) {

      this.type = "UpdateExpression";
      this.start = start;
      this.end = end;
      this.operator = op;
      this.expression = expr;
      this.prefix = prefix;
    }

    function UnaryExpression(op, expr, start, end) {

      this.type = "UnaryExpression";
      this.start = start;
      this.end = end;
      this.operator = op;
      this.expression = expr;
    }

    function MemberExpression(obj, prop, computed, start, end) {

      this.type = "MemberExpression";
      this.start = start;
      this.end = end;
      this.object = obj;
      this.property = prop;
      this.computed = computed;
    }

    function MetaProperty(left, right, start, end) {

      this.type = "MetaProperty";
      this.start = start;
      this.end = end;
      this.left = left;
      this.right = right;
    }

    function BindExpression(left, right, start, end) {

      this.type = "BindExpression";
      this.start = start;
      this.end = end;
      this.left = left;
      this.right = right;
    }

    function CallExpression(callee, args, start, end) {

      this.type = "CallExpression";
      this.start = start;
      this.end = end;
      this.callee = callee;
      this.arguments = args;
    }

    function TaggedTemplateExpression(tag, template, start, end) {

      this.type = "TaggedTemplateExpression";
      this.start = start;
      this.end = end;
      this.tag = tag;
      this.template = template;
    }

    function NewExpression(callee, args, start, end) {

      this.type = "NewExpression";
      this.start = start;
      this.end = end;
      this.callee = callee;
      this.arguments = args;
    }

    function ParenExpression(expr, start, end) {

      this.type = "ParenExpression";
      this.start = start;
      this.end = end;
      this.expression = expr;
    }

    function ObjectLiteral(props, comma, start, end) {

      this.type = "ObjectLiteral";
      this.start = start;
      this.end = end;
      this.properties = props;
      this.trailingComma = comma;
    }

    function ComputedPropertyName(expr, start, end) {

      this.type = "ComputedPropertyName";
      this.start = start;
      this.end = end;
      this.expression = expr;
    }

    function PropertyDefinition(name, expr, start, end) {

      this.type = "PropertyDefinition";
      this.start = start;
      this.end = end;
      this.name = name;
      this.expression = expr;
    }

    function ObjectPattern(props, comma, start, end) {

      this.type = "ObjectPattern";
      this.start = start;
      this.end = end;
      this.properties = props;
      this.trailingComma = comma;
    }

    function PatternProperty(name, pattern, initializer, start, end) {

      this.type = "PatternProperty";
      this.start = start;
      this.end = end;
      this.name = name;
      this.pattern = pattern;
      this.initializer = initializer;
    }

    function ArrayPattern(elements, comma, start, end) {

      this.type = "ArrayPattern";
      this.start = start;
      this.end = end;
      this.elements = elements;
      this.trailingComma = comma;
    }

    function PatternElement(pattern, initializer, start, end) {

      this.type = "PatternElement";
      this.start = start;
      this.end = end;
      this.pattern = pattern;
      this.initializer = initializer;
    }

    function PatternRestElement(pattern, start, end) {

      this.type = "PatternRestElement";
      this.start = start;
      this.end = end;
      this.pattern = pattern;
    }

    function MethodDefinition(isStatic, kind, name, params, body, start, end) {

      this.type = "MethodDefinition";
      this.start = start;
      this.end = end;
      this.static = isStatic;
      this.kind = kind;
      this.name = name;
      this.params = params;
      this.body = body;
    }

    function ArrayLiteral(elements, comma, start, end) {

      this.type = "ArrayLiteral";
      this.start = start;
      this.end = end;
      this.elements = elements;
      this.trailingComma = comma;
    }

    function TemplateExpression(lits, subs, start, end) {

      this.type = "TemplateExpression";
      this.start = start;
      this.end = end;
      this.literals = lits;
      this.substitutions = subs;
    }

    function Block(statements, start, end) {

      this.type = "Block";
      this.start = start;
      this.end = end;
      this.statements = statements;
    }

    function LabelledStatement(label, statement, start, end) {

      this.type = "LabelledStatement";
      this.start = start;
      this.end = end;
      this.label = label;
      this.statement = statement;
    }

    function ExpressionStatement(expr, start, end) {

      this.type = "ExpressionStatement";
      this.start = start;
      this.end = end;
      this.expression = expr;
    }

    function Directive(value, expr, start, end) {

      this.type = "Directive";
      this.start = start;
      this.end = end;
      this.value = value;
      this.expression = expr;
    }

    function EmptyStatement(start, end) {

      this.type = "EmptyStatement";
      this.start = start;
      this.end = end;
    }

    function VariableDeclaration(kind, list, start, end) {

      this.type = "VariableDeclaration";
      this.start = start;
      this.end = end;
      this.kind = kind;
      this.declarations = list;
    }

    function VariableDeclarator(pattern, initializer, start, end) {

      this.type = "VariableDeclarator";
      this.start = start;
      this.end = end;
      this.pattern = pattern;
      this.initializer = initializer;
    }

    function ReturnStatement(arg, start, end) {

      this.type = "ReturnStatement";
      this.start = start;
      this.end = end;
      this.argument = arg;
    }

    function BreakStatement(label, start, end) {

      this.type = "BreakStatement";
      this.start = start;
      this.end = end;
      this.label = label;
    }

    function ContinueStatement(label, start, end) {

      this.type = "ContinueStatement";
      this.start = start;
      this.end = end;
      this.label = label;
    }

    function ThrowStatement(expr, start, end) {

      this.type = "ThrowStatement";
      this.start = start;
      this.end = end;
      this.expression = expr;
    }

    function DebuggerStatement(start, end) {

      this.type = "DebuggerStatement";
      this.start = start;
      this.end = end;
    }

    function IfStatement(test, cons, alt, start, end) {

      this.type = "IfStatement";
      this.start = start;
      this.end = end;
      this.test = test;
      this.consequent = cons;
      this.alternate = alt;
    }

    function DoWhileStatement(body, test, start, end) {

      this.type = "DoWhileStatement";
      this.start = start;
      this.end = end;
      this.body = body;
      this.test = test;
    }

    function WhileStatement(test, body, start, end) {

      this.type = "WhileStatement";
      this.start = start;
      this.end = end;
      this.test = test;
      this.body = body;
    }

    function ForStatement(initializer, test, update, body, start, end) {

      this.type = "ForStatement";
      this.start = start;
      this.end = end;
      this.initializer = initializer;
      this.test = test;
      this.update = update;
      this.body = body;
    }

    function ForInStatement(left, right, body, start, end) {

      this.type = "ForInStatement";
      this.start = start;
      this.end = end;
      this.left = left;
      this.right = right;
      this.body = body;
    }

    function ForOfStatement(async, left, right, body, start, end) {

      this.type = "ForOfStatement";
      this.async = async;
      this.start = start;
      this.end = end;
      this.left = left;
      this.right = right;
      this.body = body;
    }

    function WithStatement(object, body, start, end) {

      this.type = "WithStatement";
      this.start = start;
      this.end = end;
      this.object = object;
      this.body = body;
    }

    function SwitchStatement(desc, cases, start, end) {

      this.type = "SwitchStatement";
      this.start = start;
      this.end = end;
      this.descriminant = desc;
      this.cases = cases;
    }

    function SwitchCase(test, cons, start, end) {

      this.type = "SwitchCase";
      this.start = start;
      this.end = end;
      this.test = test;
      this.consequent = cons;
    }

    function TryStatement(block, handler, fin, start, end) {

      this.type = "TryStatement";
      this.start = start;
      this.end = end;
      this.block = block;
      this.handler = handler;
      this.finalizer = fin;
    }

    function CatchClause(param, body, start, end) {

      this.type = "CatchClause";
      this.start = start;
      this.end = end;
      this.param = param;
      this.body = body;
    }

    function FunctionDeclaration(kind, identifier, params, body, start, end) {

      this.type = "FunctionDeclaration";
      this.start = start;
      this.end = end;
      this.kind = kind;
      this.identifier = identifier;
      this.params = params;
      this.body = body;
    }

    function FunctionExpression(kind, identifier, params, body, start, end) {

      this.type = "FunctionExpression";
      this.start = start;
      this.end = end;
      this.kind = kind;
      this.identifier = identifier;
      this.params = params;
      this.body = body;
    }

    function FormalParameter(pattern, initializer, start, end) {

      this.type = "FormalParameter";
      this.start = start;
      this.end = end;
      this.pattern = pattern;
      this.initializer = initializer;
    }

    function RestParameter(identifier, start, end) {

      this.type = "RestParameter";
      this.start = start;
      this.end = end;
      this.identifier = identifier;
    }

    function FunctionBody(statements, start, end) {

      this.type = "FunctionBody";
      this.start = start;
      this.end = end;
      this.statements = statements;
    }

    function ArrowFunctionHead(params, start, end) {

      this.type = "ArrowFunctionHead";
      this.start = start;
      this.end = end;
      this.parameters = params;
    }

    function ArrowFunction(kind, params, body, start, end) {

      this.type = "ArrowFunction";
      this.start = start;
      this.end = end;
      this.kind = kind;
      this.params = params;
      this.body = body;
    }

    function ClassDeclaration(identifier, base, body, start, end) {

      this.type = "ClassDeclaration";
      this.start = start;
      this.end = end;
      this.identifier = identifier;
      this.base = base;
      this.body = body;
    }

    function ClassExpression(identifier, base, body, start, end) {

      this.type = "ClassExpression";
      this.start = start;
      this.end = end;
      this.identifier = identifier;
      this.base = base;
      this.body = body;
    }

    function ClassBody(elems, start, end) {

      this.type = "ClassBody";
      this.start = start;
      this.end = end;
      this.elements = elems;
    }

    function EmptyClassElement(start, end) {

      this.type = "EmptyClassElement";
      this.start = start;
      this.end = end;
    }

    function PrivateDeclaration(name, initializer, start, end) {

      this.type = "PrivateDeclaration";
      this.start = start;
      this.end = end;
      this.name = name;
      this.initializer = initializer;
    }

    function ImportDeclaration(imports, from, start, end) {

      this.type = "ImportDeclaration";
      this.start = start;
      this.end = end;
      this.imports = imports;
      this.from = from;
    }

    function NamespaceImport(identifier, start, end) {

      this.type = "NamespaceImport";
      this.start = start;
      this.end = end;
      this.identifier = identifier;
    }

    function NamedImports(specifiers, start, end) {

      this.type = "NamedImports";
      this.start = start;
      this.end = end;
      this.specifiers = specifiers;
    }

    function DefaultImport(identifier, imports, start, end) {

      this.type = "DefaultImport";
      this.start = start;
      this.end = end;
      this.identifier = identifier;
      this.imports = imports;
    }

    function ImportSpecifier(imported, local, start, end) {

      this.type = "ImportSpecifier";
      this.start = start;
      this.end = end;
      this.imported = imported;
      this.local = local;
    }

    function ExportDeclaration(exports, start, end) {

      this.type = "ExportDeclaration";
      this.start = start;
      this.end = end;
      this.exports = exports;
    }

    function DefaultExport(binding, start, end) {

      this.type = "DefaultExport";
      this.binding = binding;
      this.start = start;
      this.end = end;
    }

    function ExportClause(specifiers, from, start, end) {

      this.type = "ExportClause";
      this.start = start;
      this.end = end;
      this.specifiers = specifiers;
      this.from = from;
    }

    function ExportSpecifier(local, exported, start, end) {

      this.type = "ExportSpecifier";
      this.start = start;
      this.end = end;
      this.local = local;
      this.exported = exported;
    }

    exports.Node = Node;
    exports.Identifier = Identifier;
    exports.AtName = AtName;
    exports.NumberLiteral = NumberLiteral;
    exports.StringLiteral = StringLiteral;
    exports.TemplatePart = TemplatePart;
    exports.RegularExpression = RegularExpression;
    exports.BooleanLiteral = BooleanLiteral;
    exports.NullLiteral = NullLiteral;
    exports.Script = Script;
    exports.Module = Module;
    exports.ThisExpression = ThisExpression;
    exports.SuperKeyword = SuperKeyword;
    exports.SequenceExpression = SequenceExpression;
    exports.AssignmentExpression = AssignmentExpression;
    exports.SpreadExpression = SpreadExpression;
    exports.YieldExpression = YieldExpression;
    exports.ConditionalExpression = ConditionalExpression;
    exports.BinaryExpression = BinaryExpression;
    exports.UpdateExpression = UpdateExpression;
    exports.UnaryExpression = UnaryExpression;
    exports.MemberExpression = MemberExpression;
    exports.MetaProperty = MetaProperty;
    exports.BindExpression = BindExpression;
    exports.CallExpression = CallExpression;
    exports.TaggedTemplateExpression = TaggedTemplateExpression;
    exports.NewExpression = NewExpression;
    exports.ParenExpression = ParenExpression;
    exports.ObjectLiteral = ObjectLiteral;
    exports.ComputedPropertyName = ComputedPropertyName;
    exports.PropertyDefinition = PropertyDefinition;
    exports.ObjectPattern = ObjectPattern;
    exports.PatternProperty = PatternProperty;
    exports.ArrayPattern = ArrayPattern;
    exports.PatternElement = PatternElement;
    exports.PatternRestElement = PatternRestElement;
    exports.MethodDefinition = MethodDefinition;
    exports.ArrayLiteral = ArrayLiteral;
    exports.TemplateExpression = TemplateExpression;
    exports.Block = Block;
    exports.LabelledStatement = LabelledStatement;
    exports.ExpressionStatement = ExpressionStatement;
    exports.Directive = Directive;
    exports.EmptyStatement = EmptyStatement;
    exports.VariableDeclaration = VariableDeclaration;
    exports.VariableDeclarator = VariableDeclarator;
    exports.ReturnStatement = ReturnStatement;
    exports.BreakStatement = BreakStatement;
    exports.ContinueStatement = ContinueStatement;
    exports.ThrowStatement = ThrowStatement;
    exports.DebuggerStatement = DebuggerStatement;
    exports.IfStatement = IfStatement;
    exports.DoWhileStatement = DoWhileStatement;
    exports.WhileStatement = WhileStatement;
    exports.ForStatement = ForStatement;
    exports.ForInStatement = ForInStatement;
    exports.ForOfStatement = ForOfStatement;
    exports.WithStatement = WithStatement;
    exports.SwitchStatement = SwitchStatement;
    exports.SwitchCase = SwitchCase;
    exports.TryStatement = TryStatement;
    exports.CatchClause = CatchClause;
    exports.FunctionDeclaration = FunctionDeclaration;
    exports.FunctionExpression = FunctionExpression;
    exports.FormalParameter = FormalParameter;
    exports.RestParameter = RestParameter;
    exports.FunctionBody = FunctionBody;
    exports.ArrowFunctionHead = ArrowFunctionHead;
    exports.ArrowFunction = ArrowFunction;
    exports.ClassDeclaration = ClassDeclaration;
    exports.ClassExpression = ClassExpression;
    exports.ClassBody = ClassBody;
    exports.EmptyClassElement = EmptyClassElement;
    exports.PrivateDeclaration = PrivateDeclaration;
    exports.ImportDeclaration = ImportDeclaration;
    exports.NamespaceImport = NamespaceImport;
    exports.NamedImports = NamedImports;
    exports.DefaultImport = DefaultImport;
    exports.ImportSpecifier = ImportSpecifier;
    exports.ExportDeclaration = ExportDeclaration;
    exports.DefaultExport = DefaultExport;
    exports.ExportClause = ExportClause;
    exports.ExportSpecifier = ExportSpecifier;


  }).call(this, _M28);

  (function(exports) {

    /*

     NOTE: We forego using classes and class-based inheritance because at this time
     super() tends to be slow in transpiled code.  Instead, we use regular constructor
     functions and give them a common prototype property.

     */

    var Nodes = _M28;
    Object.keys(_M28).forEach(function(k) {
      exports[k] = _M28[k];
    });

    function isNode(x) {

      return x !== null && typeof x === "object" && typeof x.type === "string";
    }

    var NodeBase = _esdown.class(function(__) {

      __({
        children: function() {

          var keys = Object.keys(this),
            list = [];

          for (var i$0 = 0; i$0 < keys.length; ++i$0) {

            if (keys[i$0] === "parent") break;

            var value$0 = this[keys[i$0]];

            if (Array.isArray(value$0)) {

              for (var j = 0; j < value$0.length; ++j)
                if (isNode(value$0[j])) list.push(value$0[j]);

            } else if (isNode(value$0)) {

              list.push(value$0);
            }
          }

          return list;
        }
      });;
      __({
        constructor: function NodeBase() {}
      });

    });

    Object.keys(Nodes).forEach(function(k) {
      return Nodes[k].prototype = NodeBase.prototype;
    });


  }).call(this, _M24);

  (function(exports) {

    // Unicode 6.3.0 | 2013-09-25, 18:58:50 GMT [MD]

    var IDENTIFIER = [
      36, 0, 2,
      48, 9, 3,
      65, 25, 2,
      95, 0, 2,
      97, 25, 2,
      170, 0, 2,
      181, 0, 2,
      183, 0, 3,
      186, 0, 2,
      192, 22, 2,
      216, 30, 2,
      248, 457, 2,
      710, 11, 2,
      736, 4, 2,
      748, 0, 2,
      750, 0, 2,
      768, 111, 3,
      880, 4, 2,
      886, 1, 2,
      890, 3, 2,
      902, 0, 2,
      903, 0, 3,
      904, 2, 2,
      908, 0, 2,
      910, 19, 2,
      931, 82, 2,
      1015, 138, 2,
      1155, 4, 3,
      1162, 157, 2,
      1329, 37, 2,
      1369, 0, 2,
      1377, 38, 2,
      1425, 44, 3,
      1471, 0, 3,
      1473, 1, 3,
      1476, 1, 3,
      1479, 0, 3,
      1488, 26, 2,
      1520, 2, 2,
      1552, 10, 3,
      1568, 42, 2,
      1611, 30, 3,
      1646, 1, 2,
      1648, 0, 3,
      1649, 98, 2,
      1749, 0, 2,
      1750, 6, 3,
      1759, 5, 3,
      1765, 1, 2,
      1767, 1, 3,
      1770, 3, 3,
      1774, 1, 2,
      1776, 9, 3,
      1786, 2, 2,
      1791, 0, 2,
      1808, 0, 2,
      1809, 0, 3,
      1810, 29, 2,
      1840, 26, 3,
      1869, 88, 2,
      1958, 10, 3,
      1969, 0, 2,
      1984, 9, 3,
      1994, 32, 2,
      2027, 8, 3,
      2036, 1, 2,
      2042, 0, 2,
      2048, 21, 2,
      2070, 3, 3,
      2074, 0, 2,
      2075, 8, 3,
      2084, 0, 2,
      2085, 2, 3,
      2088, 0, 2,
      2089, 4, 3,
      2112, 24, 2,
      2137, 2, 3,
      2208, 0, 2,
      2210, 10, 2,
      2276, 26, 3,
      2304, 3, 3,
      2308, 53, 2,
      2362, 2, 3,
      2365, 0, 2,
      2366, 17, 3,
      2384, 0, 2,
      2385, 6, 3,
      2392, 9, 2,
      2402, 1, 3,
      2406, 9, 3,
      2417, 6, 2,
      2425, 6, 2,
      2433, 2, 3,
      2437, 7, 2,
      2447, 1, 2,
      2451, 21, 2,
      2474, 6, 2,
      2482, 0, 2,
      2486, 3, 2,
      2492, 0, 3,
      2493, 0, 2,
      2494, 6, 3,
      2503, 1, 3,
      2507, 2, 3,
      2510, 0, 2,
      2519, 0, 3,
      2524, 1, 2,
      2527, 2, 2,
      2530, 1, 3,
      2534, 9, 3,
      2544, 1, 2,
      2561, 2, 3,
      2565, 5, 2,
      2575, 1, 2,
      2579, 21, 2,
      2602, 6, 2,
      2610, 1, 2,
      2613, 1, 2,
      2616, 1, 2,
      2620, 0, 3,
      2622, 4, 3,
      2631, 1, 3,
      2635, 2, 3,
      2641, 0, 3,
      2649, 3, 2,
      2654, 0, 2,
      2662, 11, 3,
      2674, 2, 2,
      2677, 0, 3,
      2689, 2, 3,
      2693, 8, 2,
      2703, 2, 2,
      2707, 21, 2,
      2730, 6, 2,
      2738, 1, 2,
      2741, 4, 2,
      2748, 0, 3,
      2749, 0, 2,
      2750, 7, 3,
      2759, 2, 3,
      2763, 2, 3,
      2768, 0, 2,
      2784, 1, 2,
      2786, 1, 3,
      2790, 9, 3,
      2817, 2, 3,
      2821, 7, 2,
      2831, 1, 2,
      2835, 21, 2,
      2858, 6, 2,
      2866, 1, 2,
      2869, 4, 2,
      2876, 0, 3,
      2877, 0, 2,
      2878, 6, 3,
      2887, 1, 3,
      2891, 2, 3,
      2902, 1, 3,
      2908, 1, 2,
      2911, 2, 2,
      2914, 1, 3,
      2918, 9, 3,
      2929, 0, 2,
      2946, 0, 3,
      2947, 0, 2,
      2949, 5, 2,
      2958, 2, 2,
      2962, 3, 2,
      2969, 1, 2,
      2972, 0, 2,
      2974, 1, 2,
      2979, 1, 2,
      2984, 2, 2,
      2990, 11, 2,
      3006, 4, 3,
      3014, 2, 3,
      3018, 3, 3,
      3024, 0, 2,
      3031, 0, 3,
      3046, 9, 3,
      3073, 2, 3,
      3077, 7, 2,
      3086, 2, 2,
      3090, 22, 2,
      3114, 9, 2,
      3125, 4, 2,
      3133, 0, 2,
      3134, 6, 3,
      3142, 2, 3,
      3146, 3, 3,
      3157, 1, 3,
      3160, 1, 2,
      3168, 1, 2,
      3170, 1, 3,
      3174, 9, 3,
      3202, 1, 3,
      3205, 7, 2,
      3214, 2, 2,
      3218, 22, 2,
      3242, 9, 2,
      3253, 4, 2,
      3260, 0, 3,
      3261, 0, 2,
      3262, 6, 3,
      3270, 2, 3,
      3274, 3, 3,
      3285, 1, 3,
      3294, 0, 2,
      3296, 1, 2,
      3298, 1, 3,
      3302, 9, 3,
      3313, 1, 2,
      3330, 1, 3,
      3333, 7, 2,
      3342, 2, 2,
      3346, 40, 2,
      3389, 0, 2,
      3390, 6, 3,
      3398, 2, 3,
      3402, 3, 3,
      3406, 0, 2,
      3415, 0, 3,
      3424, 1, 2,
      3426, 1, 3,
      3430, 9, 3,
      3450, 5, 2,
      3458, 1, 3,
      3461, 17, 2,
      3482, 23, 2,
      3507, 8, 2,
      3517, 0, 2,
      3520, 6, 2,
      3530, 0, 3,
      3535, 5, 3,
      3542, 0, 3,
      3544, 7, 3,
      3570, 1, 3,
      3585, 47, 2,
      3633, 0, 3,
      3634, 1, 2,
      3636, 6, 3,
      3648, 6, 2,
      3655, 7, 3,
      3664, 9, 3,
      3713, 1, 2,
      3716, 0, 2,
      3719, 1, 2,
      3722, 0, 2,
      3725, 0, 2,
      3732, 3, 2,
      3737, 6, 2,
      3745, 2, 2,
      3749, 0, 2,
      3751, 0, 2,
      3754, 1, 2,
      3757, 3, 2,
      3761, 0, 3,
      3762, 1, 2,
      3764, 5, 3,
      3771, 1, 3,
      3773, 0, 2,
      3776, 4, 2,
      3782, 0, 2,
      3784, 5, 3,
      3792, 9, 3,
      3804, 3, 2,
      3840, 0, 2,
      3864, 1, 3,
      3872, 9, 3,
      3893, 0, 3,
      3895, 0, 3,
      3897, 0, 3,
      3902, 1, 3,
      3904, 7, 2,
      3913, 35, 2,
      3953, 19, 3,
      3974, 1, 3,
      3976, 4, 2,
      3981, 10, 3,
      3993, 35, 3,
      4038, 0, 3,
      4096, 42, 2,
      4139, 19, 3,
      4159, 0, 2,
      4160, 9, 3,
      4176, 5, 2,
      4182, 3, 3,
      4186, 3, 2,
      4190, 2, 3,
      4193, 0, 2,
      4194, 2, 3,
      4197, 1, 2,
      4199, 6, 3,
      4206, 2, 2,
      4209, 3, 3,
      4213, 12, 2,
      4226, 11, 3,
      4238, 0, 2,
      4239, 14, 3,
      4256, 37, 2,
      4295, 0, 2,
      4301, 0, 2,
      4304, 42, 2,
      4348, 332, 2,
      4682, 3, 2,
      4688, 6, 2,
      4696, 0, 2,
      4698, 3, 2,
      4704, 40, 2,
      4746, 3, 2,
      4752, 32, 2,
      4786, 3, 2,
      4792, 6, 2,
      4800, 0, 2,
      4802, 3, 2,
      4808, 14, 2,
      4824, 56, 2,
      4882, 3, 2,
      4888, 66, 2,
      4957, 2, 3,
      4969, 8, 3,
      4992, 15, 2,
      5024, 84, 2,
      5121, 619, 2,
      5743, 16, 2,
      5761, 25, 2,
      5792, 74, 2,
      5870, 2, 2,
      5888, 12, 2,
      5902, 3, 2,
      5906, 2, 3,
      5920, 17, 2,
      5938, 2, 3,
      5952, 17, 2,
      5970, 1, 3,
      5984, 12, 2,
      5998, 2, 2,
      6002, 1, 3,
      6016, 51, 2,
      6068, 31, 3,
      6103, 0, 2,
      6108, 0, 2,
      6109, 0, 3,
      6112, 9, 3,
      6155, 2, 3,
      6160, 9, 3,
      6176, 87, 2,
      6272, 40, 2,
      6313, 0, 3,
      6314, 0, 2,
      6320, 69, 2,
      6400, 28, 2,
      6432, 11, 3,
      6448, 11, 3,
      6470, 9, 3,
      6480, 29, 2,
      6512, 4, 2,
      6528, 43, 2,
      6576, 16, 3,
      6593, 6, 2,
      6600, 1, 3,
      6608, 10, 3,
      6656, 22, 2,
      6679, 4, 3,
      6688, 52, 2,
      6741, 9, 3,
      6752, 28, 3,
      6783, 10, 3,
      6800, 9, 3,
      6823, 0, 2,
      6912, 4, 3,
      6917, 46, 2,
      6964, 16, 3,
      6981, 6, 2,
      6992, 9, 3,
      7019, 8, 3,
      7040, 2, 3,
      7043, 29, 2,
      7073, 12, 3,
      7086, 1, 2,
      7088, 9, 3,
      7098, 43, 2,
      7142, 13, 3,
      7168, 35, 2,
      7204, 19, 3,
      7232, 9, 3,
      7245, 2, 2,
      7248, 9, 3,
      7258, 35, 2,
      7376, 2, 3,
      7380, 20, 3,
      7401, 3, 2,
      7405, 0, 3,
      7406, 3, 2,
      7410, 2, 3,
      7413, 1, 2,
      7424, 191, 2,
      7616, 38, 3,
      7676, 3, 3,
      7680, 277, 2,
      7960, 5, 2,
      7968, 37, 2,
      8008, 5, 2,
      8016, 7, 2,
      8025, 0, 2,
      8027, 0, 2,
      8029, 0, 2,
      8031, 30, 2,
      8064, 52, 2,
      8118, 6, 2,
      8126, 0, 2,
      8130, 2, 2,
      8134, 6, 2,
      8144, 3, 2,
      8150, 5, 2,
      8160, 12, 2,
      8178, 2, 2,
      8182, 6, 2,
      8204, 1, 3,
      8255, 1, 3,
      8276, 0, 3,
      8305, 0, 2,
      8319, 0, 2,
      8336, 12, 2,
      8400, 12, 3,
      8417, 0, 3,
      8421, 11, 3,
      8450, 0, 2,
      8455, 0, 2,
      8458, 9, 2,
      8469, 0, 2,
      8472, 5, 2,
      8484, 0, 2,
      8486, 0, 2,
      8488, 0, 2,
      8490, 15, 2,
      8508, 3, 2,
      8517, 4, 2,
      8526, 0, 2,
      8544, 40, 2,
      11264, 46, 2,
      11312, 46, 2,
      11360, 132, 2,
      11499, 3, 2,
      11503, 2, 3,
      11506, 1, 2,
      11520, 37, 2,
      11559, 0, 2,
      11565, 0, 2,
      11568, 55, 2,
      11631, 0, 2,
      11647, 0, 3,
      11648, 22, 2,
      11680, 6, 2,
      11688, 6, 2,
      11696, 6, 2,
      11704, 6, 2,
      11712, 6, 2,
      11720, 6, 2,
      11728, 6, 2,
      11736, 6, 2,
      11744, 31, 3,
      12293, 2, 2,
      12321, 8, 2,
      12330, 5, 3,
      12337, 4, 2,
      12344, 4, 2,
      12353, 85, 2,
      12441, 1, 3,
      12443, 4, 2,
      12449, 89, 2,
      12540, 3, 2,
      12549, 40, 2,
      12593, 93, 2,
      12704, 26, 2,
      12784, 15, 2,
      13312, 6581, 2,
      19968, 20940, 2,
      40960, 1164, 2,
      42192, 45, 2,
      42240, 268, 2,
      42512, 15, 2,
      42528, 9, 3,
      42538, 1, 2,
      42560, 46, 2,
      42607, 0, 3,
      42612, 9, 3,
      42623, 24, 2,
      42655, 0, 3,
      42656, 79, 2,
      42736, 1, 3,
      42775, 8, 2,
      42786, 102, 2,
      42891, 3, 2,
      42896, 3, 2,
      42912, 10, 2,
      43000, 9, 2,
      43010, 0, 3,
      43011, 2, 2,
      43014, 0, 3,
      43015, 3, 2,
      43019, 0, 3,
      43020, 22, 2,
      43043, 4, 3,
      43072, 51, 2,
      43136, 1, 3,
      43138, 49, 2,
      43188, 16, 3,
      43216, 9, 3,
      43232, 17, 3,
      43250, 5, 2,
      43259, 0, 2,
      43264, 9, 3,
      43274, 27, 2,
      43302, 7, 3,
      43312, 22, 2,
      43335, 12, 3,
      43360, 28, 2,
      43392, 3, 3,
      43396, 46, 2,
      43443, 13, 3,
      43471, 0, 2,
      43472, 9, 3,
      43520, 40, 2,
      43561, 13, 3,
      43584, 2, 2,
      43587, 0, 3,
      43588, 7, 2,
      43596, 1, 3,
      43600, 9, 3,
      43616, 22, 2,
      43642, 0, 2,
      43643, 0, 3,
      43648, 47, 2,
      43696, 0, 3,
      43697, 0, 2,
      43698, 2, 3,
      43701, 1, 2,
      43703, 1, 3,
      43705, 4, 2,
      43710, 1, 3,
      43712, 0, 2,
      43713, 0, 3,
      43714, 0, 2,
      43739, 2, 2,
      43744, 10, 2,
      43755, 4, 3,
      43762, 2, 2,
      43765, 1, 3,
      43777, 5, 2,
      43785, 5, 2,
      43793, 5, 2,
      43808, 6, 2,
      43816, 6, 2,
      43968, 34, 2,
      44003, 7, 3,
      44012, 1, 3,
      44016, 9, 3,
      44032, 11171, 2,
      55216, 22, 2,
      55243, 48, 2,
      63744, 365, 2,
      64112, 105, 2,
      64256, 6, 2,
      64275, 4, 2,
      64285, 0, 2,
      64286, 0, 3,
      64287, 9, 2,
      64298, 12, 2,
      64312, 4, 2,
      64318, 0, 2,
      64320, 1, 2,
      64323, 1, 2,
      64326, 107, 2,
      64467, 362, 2,
      64848, 63, 2,
      64914, 53, 2,
      65008, 11, 2,
      65024, 15, 3,
      65056, 6, 3,
      65075, 1, 3,
      65101, 2, 3,
      65136, 4, 2,
      65142, 134, 2,
      65296, 9, 3,
      65313, 25, 2,
      65343, 0, 3,
      65345, 25, 2,
      65382, 88, 2,
      65474, 5, 2,
      65482, 5, 2,
      65490, 5, 2,
      65498, 2, 2,
      65536, 11, 2,
      65549, 25, 2,
      65576, 18, 2,
      65596, 1, 2,
      65599, 14, 2,
      65616, 13, 2,
      65664, 122, 2,
      65856, 52, 2,
      66045, 0, 3,
      66176, 28, 2,
      66208, 48, 2,
      66304, 30, 2,
      66352, 26, 2,
      66432, 29, 2,
      66464, 35, 2,
      66504, 7, 2,
      66513, 4, 2,
      66560, 157, 2,
      66720, 9, 3,
      67584, 5, 2,
      67592, 0, 2,
      67594, 43, 2,
      67639, 1, 2,
      67644, 0, 2,
      67647, 22, 2,
      67840, 21, 2,
      67872, 25, 2,
      67968, 55, 2,
      68030, 1, 2,
      68096, 0, 2,
      68097, 2, 3,
      68101, 1, 3,
      68108, 3, 3,
      68112, 3, 2,
      68117, 2, 2,
      68121, 26, 2,
      68152, 2, 3,
      68159, 0, 3,
      68192, 28, 2,
      68352, 53, 2,
      68416, 21, 2,
      68448, 18, 2,
      68608, 72, 2,
      69632, 2, 3,
      69635, 52, 2,
      69688, 14, 3,
      69734, 9, 3,
      69760, 2, 3,
      69763, 44, 2,
      69808, 10, 3,
      69840, 24, 2,
      69872, 9, 3,
      69888, 2, 3,
      69891, 35, 2,
      69927, 13, 3,
      69942, 9, 3,
      70016, 2, 3,
      70019, 47, 2,
      70067, 13, 3,
      70081, 3, 2,
      70096, 9, 3,
      71296, 42, 2,
      71339, 12, 3,
      71360, 9, 3,
      73728, 878, 2,
      74752, 98, 2,
      77824, 1070, 2,
      92160, 568, 2,
      93952, 68, 2,
      94032, 0, 2,
      94033, 45, 3,
      94095, 3, 3,
      94099, 12, 2,
      110592, 1, 2,
      119141, 4, 3,
      119149, 5, 3,
      119163, 7, 3,
      119173, 6, 3,
      119210, 3, 3,
      119362, 2, 3,
      119808, 84, 2,
      119894, 70, 2,
      119966, 1, 2,
      119970, 0, 2,
      119973, 1, 2,
      119977, 3, 2,
      119982, 11, 2,
      119995, 0, 2,
      119997, 6, 2,
      120005, 64, 2,
      120071, 3, 2,
      120077, 7, 2,
      120086, 6, 2,
      120094, 27, 2,
      120123, 3, 2,
      120128, 4, 2,
      120134, 0, 2,
      120138, 6, 2,
      120146, 339, 2,
      120488, 24, 2,
      120514, 24, 2,
      120540, 30, 2,
      120572, 24, 2,
      120598, 30, 2,
      120630, 24, 2,
      120656, 30, 2,
      120688, 24, 2,
      120714, 30, 2,
      120746, 24, 2,
      120772, 7, 2,
      120782, 49, 3,
      126464, 3, 2,
      126469, 26, 2,
      126497, 1, 2,
      126500, 0, 2,
      126503, 0, 2,
      126505, 9, 2,
      126516, 3, 2,
      126521, 0, 2,
      126523, 0, 2,
      126530, 0, 2,
      126535, 0, 2,
      126537, 0, 2,
      126539, 0, 2,
      126541, 2, 2,
      126545, 1, 2,
      126548, 0, 2,
      126551, 0, 2,
      126553, 0, 2,
      126555, 0, 2,
      126557, 0, 2,
      126559, 0, 2,
      126561, 1, 2,
      126564, 0, 2,
      126567, 3, 2,
      126572, 6, 2,
      126580, 3, 2,
      126585, 3, 2,
      126590, 0, 2,
      126592, 9, 2,
      126603, 16, 2,
      126625, 2, 2,
      126629, 4, 2,
      126635, 16, 2,
      131072, 42710, 2,
      173824, 4148, 2,
      177984, 221, 2,
      194560, 541, 2,
      917760, 239, 3];

    var WHITESPACE = [
      9, 0, 1,
      11, 1, 1,
      32, 0, 1,
      160, 0, 1,
      5760, 0, 1,
      8192, 10, 1,
      8239, 0, 1,
      8287, 0, 1,
      12288, 0, 1,
      65279, 0, 1];


    exports.IDENTIFIER = IDENTIFIER;
    exports.WHITESPACE = WHITESPACE;


  }).call(this, _M31);

  (function(exports) {

    var IDENTIFIER = _M31.IDENTIFIER,
      WHITESPACE = _M31.WHITESPACE;

    function binarySearch(table, val) {

      var right = (table.length / 3) - 1,
        left = 0,
        mid = 0,
        test = 0,
        offset = 0;

      while (left <= right) {

        mid = (left + right) >> 1;
        offset = mid * 3;
        test = table[offset];

        if (val < test) {

          right = mid - 1;

        } else if (val === test || val <= test + table[offset + 1]) {

          return table[offset + 2];

        } else {

          left = mid + 1;
        }
      }

      return 0;
    }

    function isIdentifierStart(code) {

      return binarySearch(IDENTIFIER, code) === 2;
    }

    function isIdentifierPart(code) {

      return binarySearch(IDENTIFIER, code) >= 2;
    }

    function isWhitespace(code) {

      return binarySearch(WHITESPACE, code) === 1;
    }

    function codePointLength(code) {

      return code > 0xffff ? 2 : 1;
    }

    function codePointAt(str, offset) {

      var a = str.charCodeAt(offset);

      if (a >= 0xd800 && a <= 0xdbff && str.length > offset + 1) {

        var b$0 = str.charCodeAt(offset + 1);

        if (b$0 >= 0xdc00 && b$0 <= 0xdfff) return (a - 0xd800) * 0x400 + b$0 - 0xdc00 + 0x10000;
      }

      return a;
    }

    function codePointString(code) {

      if (code > 0x10ffff) return "";

      if (code <= 0xffff) return String.fromCharCode(code);

      // If value is greater than 0xffff, then it must be encoded
      // as 2 UTF-16 code units in a surrogate pair.

      code -= 0x10000;

      return String.fromCharCode(
        (code >> 10) + 0xd800, (code % 0x400) + 0xdc00);
    }


    exports.isIdentifierStart = isIdentifierStart;
    exports.isIdentifierPart = isIdentifierPart;
    exports.isWhitespace = isWhitespace;
    exports.codePointLength = codePointLength;
    exports.codePointAt = codePointAt;
    exports.codePointString = codePointString;


  }).call(this, _M29);

  (function(exports) {

    // Performs a binary search on an array
    function binarySearch(array, val) {

      var right = array.length - 1,
        left = 0;

      while (left <= right) {

        var mid$0 = (left + right) >> 1,
          test$0 = array[mid$0];

        if (val === test$0) return mid$0;

        if (val < test$0) right = mid$0 - 1;
        else left = mid$0 + 1;
      }

      return left;
    }

    var LineMap = _esdown.class(function(__) {

      __({
        constructor: function LineMap() {

          this.lines = [-1];
          this.lastLineBreak = -1;
        }
      });

      __({
        addBreak: function(offset) {

          if (offset > this.lastLineBreak) this.lines.push(this.lastLineBreak = offset);
        }
      });

      __({
        locate: function(offset) {

          var line = binarySearch(this.lines, offset),
            pos = this.lines[line - 1],
            column = offset - pos;

          return {
            line: line,
            column: column,
            lineOffset: pos + 1
          };
        }
      });
    });

    exports.LineMap = LineMap;


  }).call(this, _M30);

  (function(exports) {

    var isIdentifierStart = _M29.isIdentifierStart,
      isIdentifierPart = _M29.isIdentifierPart,
      isWhitespace = _M29.isWhitespace,
      codePointLength = _M29.codePointLength,
      codePointAt = _M29.codePointAt,
      codePointString = _M29.codePointString;





    var LineMap = _M30.LineMap;

    var identifierEscape = /\\u([0-9a-fA-F]{4})/g,
      newlineSequence = /\r\n?|[\n\u2028\u2029]/g,
      crNewline = /\r\n?/g;

    // === Reserved Words ===
    var reservedWord = new RegExp("^(?:" + "break|case|catch|class|const|continue|debugger|default|delete|do|" + "else|enum|export|extends|false|finally|for|function|if|import|in|" + "instanceof|new|null|return|super|switch|this|throw|true|try|typeof|" + "var|void|while|with" + ")$");

    var strictReservedWord = new RegExp("^(?:" + "implements|private|public|interface|package|let|protected|static|yield" + ")$");

    // === Punctuators ===
    var multiCharPunctuator = new RegExp("^(?:" + "--|[+]{2}|" + "&&|[|]{2}|" + "<<=?|" + ">>>?=?|" + "[!=]==|" + "=>|" + "[\.]{2,3}|" + "::|" + "[-+&|<>!=*&\^%\/]=" + ")$");

    // === Miscellaneous Patterns ===
    var octalEscape = /^(?:[0-3][0-7]{0,2}|[4-7][0-7]?)/,
      blockCommentPattern = /\r\n?|[\n\u2028\u2029]|\*\//g,
      hexChar = /[0-9a-f]/i;

    // === Character type lookup table ===
    function makeCharTable() {

      var table = [];

      for (var i$0 = 0; i$0 < 128; ++i$0) table[i$0] = "";
      for (var i$1 = 65; i$1 <= 90; ++i$1) table[i$1] = "identifier";
      for (var i$2 = 97; i$2 <= 122; ++i$2) table[i$2] = "identifier";

      add("whitespace", "\t\v\f ");
      add("newline", "\r\n");
      add("decimal-digit", "123456789");
      add("punctuator-char", "{[]();,?");
      add("punctuator", "<>+-*%&|^!~=:");
      add("dot", ".");
      add("slash", "/");
      add("rbrace", "}");
      add("zero", "0");
      add("string", "'\"");
      add("template", "`");
      add("identifier", "$_\\");
      add("at", "@");

      return table;

      function add(type, string) {

        string.split("").forEach(function(c) {
          return table[c.charCodeAt(0)] = type;
        });
      }
    }

    var charTable = makeCharTable();

    // Returns true if the character is a valid identifier part
    function isIdentifierPartAscii(c) {

      return c > 64 && c < 91 || c > 96 && c < 123 || c > 47 && c < 58 || c === 36 || c === 95;
    }

    // Returns true if the specified character is a newline
    function isNewlineChar(c) {

      switch (c) {

        case "\r":
        case "\n":
        case "\u2028":
        case "\u2029":
          return true;
      }

      return false;
    }

    // Returns true if the specified character can exist in a non-starting position
    function isPunctuatorNext(c) {

      switch (c) {

        case "+":
        case "-":
        case "&":
        case "|":
        case "<":
        case ">":
        case "=":
        case ".":
        case ":":
          return true;
      }

      return false;
    }

    // Returns true if the specified string is a reserved word
    function isReservedWord(word) {

      return reservedWord.test(word);
    }

    // Returns true if the specified string is a strict mode reserved word
    function isStrictReservedWord(word) {

      return strictReservedWord.test(word);
    }

    var Scanner = _esdown.class(function(__) {

      __({
        constructor: function Scanner(input) {

          this.input = input || "";
          this.offset = 0;
          this.length = this.input.length;
          this.lineMap = new LineMap;

          this.value = "";
          this.number = 0;
          this.regexFlags = "";
          this.templateEnd = false;
          this.newlineBefore = false;
          this.strictError = "";
          this.start = 0;
          this.end = 0;
        }
      });

      __({
        skip: function() {

          return this.next("skip");
        }
      });

      __({
        next: function(context) {

          if (this.type !== "COMMENT") this.newlineBefore = false;

          this.strictError = "";

          do {

            this.start = this.offset;

            this.type = this.start >= this.length ? this.EOF() : context === "skip" ? this.Skip() : this.Start(context);

          } while (!this.type);

          this.end = this.offset;

          return this.type;
        }
      });

      // TODO:  Should this be put on ParseResult instead?
      __({
        rawValue: function(start, end) {

          // Line endings are normalized to <LF>
          return this.input.slice(start, end).replace(crNewline, "\n");
        }
      });

      __({
        peekChar: function() {

          return this.input.charAt(this.offset);
        }
      });

      __({
        peekCharAt: function(n) {

          return this.input.charAt(this.offset + n);
        }
      });

      __({
        peekCodePoint: function() {

          return codePointAt(this.input, this.offset);
        }
      });

      __({
        peekCode: function() {

          return this.input.charCodeAt(this.offset) | 0;
        }
      });

      __({
        peekCodeAt: function(n) {

          return this.input.charCodeAt(this.offset + n) | 0;
        }
      });

      __({
        readChar: function() {

          return this.input.charAt(this.offset++);
        }
      });

      __({
        readUnicodeEscapeValue: function() {

          var hex = "";

          if (this.peekChar() === "{") {

            this.offset++;
            hex = this.readHex(0);

            if (hex.length < 1 || this.readChar() !== "}") return null;

          } else {

            hex = this.readHex(4);

            if (hex.length < 4) return null;
          }

          return parseInt(hex, 16);
        }
      });

      __({
        readUnicodeEscape: function() {

          var cp = this.readUnicodeEscapeValue(),
            val = codePointString(cp);

          return val === "" ? null : val;
        }
      });

      __({
        readIdentifierEscape: function(startChar) {

          this.offset++;

          if (this.readChar() !== "u") return null;

          var cp = this.readUnicodeEscapeValue();

          if (startChar) {

            if (!isIdentifierStart(cp)) return null;

          } else {

            if (!isIdentifierPart(cp)) return null;
          }

          return codePointString(cp);
        }
      });

      __({
        readOctalEscape: function() {

          var m = octalEscape.exec(this.input.slice(this.offset, this.offset + 3)),
            val = m ? m[0] : "";

          this.offset += val.length;

          return val;
        }
      });

      __({
        readStringEscape: function(continuationChar) {

          this.offset++;

          var chr = "",
            esc = "";

          switch (chr = this.readChar()) {

            case "t":
              return "\t";
            case "b":
              return "\b";
            case "v":
              return "\v";
            case "f":
              return "\f";
            case "r":
              return "\r";
            case "n":
              return "\n";

            case "\r":

              this.lineMap.addBreak(this.offset - 1);

              if (this.peekChar() === "\n") this.offset++;

              return continuationChar;

            case "\n":
            case "\u2028":
            case "\u2029":

              this.lineMap.addBreak(this.offset - 1);
              return continuationChar;

            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":

              this.offset--;
              esc = this.readOctalEscape();

              if (esc === "0") {

                return String.fromCharCode(0);

              } else {

                this.strictError = "Octal literals are not allowed in strict mode";
                return String.fromCharCode(parseInt(esc, 8));
              }

            case "x":

              esc = this.readHex(2);
              return (esc.length < 2) ? null : String.fromCharCode(parseInt(esc, 16));

            case "u":

              return this.readUnicodeEscape();

            default:

              return chr;
          }
        }
      });

      __({
        readRange: function(low, high) {

          var start = this.offset,
            code = 0;

          while (code = this.peekCode()) {

            if (code >= low && code <= high) this.offset++;
            else break;
          }

          return this.input.slice(start, this.offset);
        }
      });

      __({
        readInteger: function() {

          var start = this.offset,
            code = 0;

          while (code = this.peekCode()) {

            if (code >= 48 && code <= 57) this.offset++;
            else break;
          }

          return this.input.slice(start, this.offset);
        }
      });

      __({
        readHex: function(maxLen) {

          var str = "",
            chr = "";

          while (chr = this.peekChar()) {

            if (!hexChar.test(chr)) break;

            str += chr;
            this.offset++;

            if (str.length === maxLen) break;
          }

          return str;
        }
      });

      __({
        peekNumberFollow: function() {

          var c = this.peekCode();

          if (c > 127) return !isIdentifierStart(this.peekCodePoint());

          return !(
          c > 64 && c < 91 || c > 96 && c < 123 || c > 47 && c < 58 || c === 36 || c === 95 || c === 92);
        }
      });

      __({
        Skip: function() {

          var code = this.peekCode();

          if (code < 128) {

            switch (charTable[code]) {

              case "whitespace":
                return this.Whitespace();

              case "newline":
                return this.Newline(code);

              case "slash":

                var next$0 = this.peekCodeAt(1);

                if (next$0 === 47) return this.LineComment(); // /
                else if (next$0 === 42) return this.BlockComment(); // *
            }

          } else {

            // Unicode newlines
            if (isNewlineChar(this.peekChar())) return this.Newline(code);

            var cp$0 = this.peekCodePoint();

            // Unicode whitespace
            if (isWhitespace(cp$0)) return this.UnicodeWhitespace(cp$0);
          }

          return "UNKNOWN";
        }
      });

      __({
        Start: function(context) {

          var code = this.peekCode(),
            next = 0;

          switch (charTable[code]) {

            case "punctuator-char":
              return this.PunctuatorChar();

            case "whitespace":
              return this.Whitespace();

            case "identifier":
              return this.Identifier(context, code);

            case "rbrace":

              if (context === "template") return this.Template();
              else return this.PunctuatorChar();

            case "punctuator":
              return this.Punctuator();

            case "newline":
              return this.Newline(code);

            case "decimal-digit":
              return this.Number();

            case "template":
              return this.Template();

            case "string":
              return this.String();

            case "at":
              return this.AtName();

            case "zero":

              switch (next = this.peekCodeAt(1)) {

                case 88:
                case 120:
                  return this.HexNumber(); // x
                case 66:
                case 98:
                  return this.BinaryNumber(); // b
                case 79:
                case 111:
                  return this.OctalNumber(); // o
              }

              return next >= 48 && next <= 55 ? this.LegacyOctalNumber() : this.Number();

            case "dot":

              next = this.peekCodeAt(1);

              if (next >= 48 && next <= 57) return this.Number();
              else return this.Punctuator();

            case "slash":

              next = this.peekCodeAt(1);

              if (next === 47) return this.LineComment(); // /
              else if (next === 42) return this.BlockComment(); // *
              else if (context === "div") return this.Punctuator();
              else return this.RegularExpression();

          }

          // Unicode newlines
          if (isNewlineChar(this.peekChar())) return this.Newline(code);

          var cp = this.peekCodePoint();

          // Unicode whitespace
          if (isWhitespace(cp)) return this.UnicodeWhitespace(cp);

          // Unicode identifier chars
          if (isIdentifierStart(cp)) return this.Identifier(context, cp);

          return this.Error();
        }
      });

      __({
        Whitespace: function() {

          this.offset++;

          var code = 0;

          while (code = this.peekCode()) {

            // ASCII Whitespace:  [\t] [\v] [\f] [ ]
            if (code === 9 || code === 11 || code === 12 || code === 32) this.offset++;
            else break;
          }

          return "";
        }
      });

      __({
        UnicodeWhitespace: function(cp) {

          this.offset += codePointLength(cp);

          // General unicode whitespace
          while (isWhitespace(cp = this.peekCodePoint()))
            this.offset += codePointLength(cp);

          return "";
        }
      });

      __({
        Newline: function(code) {

          this.lineMap.addBreak(this.offset++);

          // Treat /r/n as a single newline
          if (code === 13 && this.peekCode() === 10) this.offset++;

          this.newlineBefore = true;

          return "";
        }
      });

      __({
        PunctuatorChar: function() {

          return this.readChar();
        }
      });

      __({
        Punctuator: function() {

          var op = this.readChar(),
            chr = "",
            next = "";

          while (
          isPunctuatorNext(chr = this.peekChar()) && multiCharPunctuator.test(next = op + chr)) {

            this.offset++;
            op = next;
          }

          // ".." is not a valid token
          if (op === "..") {

            this.offset--;
            op = ".";
          }

          return op;
        }
      });

      __({
        Template: function() {

          var first = this.readChar(),
            end = false,
            val = "",
            esc = "",
            chr = "";

          while (chr = this.peekChar()) {

            if (chr === "`") {

              end = true;
              break;
            }

            if (chr === "$" && this.peekCharAt(1) === "{") {

              this.offset++;
              break;
            }

            if (chr === "\\") {

              esc = this.readStringEscape("\n");

              if (esc === null) return this.Error();

              val += esc;

            } else {

              val += chr;
              this.offset++;
            }
          }

          if (!chr) return this.Error();

          this.offset++;
          this.value = val;
          this.templateEnd = end;

          return "TEMPLATE";
        }
      });

      __({
        String: function() {

          var delim = this.readChar(),
            val = "",
            esc = "",
            chr = "";

          while (chr = this.input[this.offset]) {

            if (chr === delim) break;

            if (isNewlineChar(chr)) return this.Error();

            if (chr === "\\") {

              esc = this.readStringEscape("");

              if (esc === null) return this.Error();

              val += esc;

            } else {

              val += chr;
              this.offset++;
            }
          }

          if (!chr) return this.Error();

          this.offset++;
          this.value = val;

          return "STRING";
        }
      });

      __({
        RegularExpression: function() {

          this.offset++;

          var backslash = false,
            inClass = false,
            val = "",
            chr = "",
            code = 0,
            flagStart = 0;

          while (chr = this.readChar()) {

            if (isNewlineChar(chr)) return this.Error();

            if (backslash) {

              val += "\\" + chr;
              backslash = false;

            } else if (chr === "[") {

              inClass = true;
              val += chr;

            } else if (chr === "]" && inClass) {

              inClass = false;
              val += chr;

            } else if (chr === "/" && !inClass) {

              break;

            } else if (chr === "\\") {

              backslash = true;

            } else {

              val += chr;
            }
          }

          if (!chr) return this.Error();

          flagStart = this.offset;

          while (true) {

            code = this.peekCode();

            if (code === 92) {

              return this.Error();

            } else if (code > 127) {

              if (isIdentifierPart(code = this.peekCodePoint())) this.offset += codePointLength(code);
              else break;

            } else if (isIdentifierPartAscii(code)) {

              this.offset++;

            } else {

              break;
            }
          }

          this.value = val;
          this.regexFlags = this.input.slice(flagStart, this.offset);

          return "REGEX";
        }
      });

      __({
        LegacyOctalNumber: function() {

          this.offset++;

          var start = this.offset,
            code = 0;

          while (code = this.peekCode()) {

            if (code >= 48 && code <= 55) this.offset++;
            else break;
          }

          this.strictError = "Octal literals are not allowed in strict mode";

          var val = parseInt(this.input.slice(start, this.offset), 8);

          if (!this.peekNumberFollow()) return this.Error();

          this.number = val;

          return "NUMBER";
        }
      });

      __({
        Number: function() {

          var start = this.offset,
            next = "";

          this.readInteger();

          if ((next = this.peekChar()) === ".") {

            this.offset++;
            this.readInteger();
            next = this.peekChar();
          }

          if (next === "e" || next === "E") {

            this.offset++;

            next = this.peekChar();

            if (next === "+" || next === "-") this.offset++;

            if (!this.readInteger()) return this.Error();
          }

          var val = parseFloat(this.input.slice(start, this.offset));

          if (!this.peekNumberFollow()) return this.Error();

          this.number = val;

          return "NUMBER";
        }
      });

      __({
        BinaryNumber: function() {

          this.offset += 2;

          var val = parseInt(this.readRange(48, 49), 2);

          if (!this.peekNumberFollow()) return this.Error();

          this.number = val;

          return "NUMBER";
        }
      });

      __({
        OctalNumber: function() {

          this.offset += 2;

          var val = parseInt(this.readRange(48, 55), 8);

          if (!this.peekNumberFollow()) return this.Error();

          this.number = val;

          return "NUMBER";
        }
      });

      __({
        HexNumber: function() {

          this.offset += 2;

          var val = parseInt(this.readHex(0), 16);

          if (!this.peekNumberFollow()) return this.Error();

          this.number = val;

          return "NUMBER";
        }
      });

      __({
        Identifier: function(context, code) {

          var start = this.offset,
            val = "",
            esc = "";

          // Identifier Start

          if (code === 92) {

            esc = this.readIdentifierEscape(true);

            if (esc === null) return this.Error();

            val = esc;
            start = this.offset;

          } else if (code > 127) {

            this.offset += codePointLength(code);

          } else {

            this.offset++;
          }

          // Identifier Part

          while (true) {

            code = this.peekCode();

            if (code === 92) {

              val += this.input.slice(start, this.offset);
              esc = this.readIdentifierEscape(false);

              if (esc === null) return this.Error();

              val += esc;
              start = this.offset;

            } else if (code > 127) {

              if (isIdentifierPart(code = this.peekCodePoint())) this.offset += codePointLength(code);
              else break;

            } else if (isIdentifierPartAscii(code)) {

              this.offset++;

            } else {

              break;
            }
          }

          val += this.input.slice(start, this.offset);

          this.value = val;

          if (context !== "name" && isReservedWord(val)) return esc ? this.Error() : val;

          return "IDENTIFIER";
        }
      });

      __({
        AtName: function() {

          this.offset += 1;

          if (this.Start("name") !== "IDENTIFIER") return this.Error();

          // TODO: This is a bit of a hack
          this.value = "@" + this.value;

          return "ATNAME";
        }
      });

      __({
        LineComment: function() {

          this.offset += 2;

          var start = this.offset,
            chr = "";

          while (chr = this.peekChar()) {

            if (isNewlineChar(chr)) break;

            this.offset++;
          }

          this.value = this.input.slice(start, this.offset);

          return "COMMENT";
        }
      });

      __({
        BlockComment: function() {

          this.offset += 2;

          var pattern = blockCommentPattern,
            start = this.offset;

          while (true) {

            pattern.lastIndex = this.offset;

            var m$0 = pattern.exec(this.input);
            if (!m$0) return this.Error();

            this.offset = m$0.index + m$0[0].length;

            if (m$0[0] === "*/") break;

            this.newlineBefore = true;
            this.lineMap.addBreak(m$0.index);
          }

          this.value = this.input.slice(start, this.offset - 2);

          return "COMMENT";
        }
      });

      __({
        EOF: function() {

          return "EOF";
        }
      });

      __({
        Error: function(msg) {

          if (this.start === this.offset) this.offset++;

          return "ILLEGAL";
        }
      });

    });

    exports.isReservedWord = isReservedWord;
    exports.isStrictReservedWord = isStrictReservedWord;
    exports.Scanner = Scanner;


  }).call(this, _M25);

  (function(exports) {

    var AST = _M24;
    var isReservedWord = _M25.isReservedWord;


    var Transform = _esdown.class(function(__) {

      // Transform an expression into a formal parameter list
      __({
        transformFormals: function(expr) {

          if (!expr) return [];

          var list;

          switch (expr.type) {

            case "SequenceExpression":
              list = expr.expressions;
              break;
            case "CallExpression":
              list = expr.arguments;
              break;
            default:
              list = [expr];
              break;
          }

          for (var i$0 = 0; i$0 < list.length; ++i$0) {

            var node$0 = list[i$0],
              param$0;

            if (i$0 === list.length - 1 && node$0.type === "SpreadExpression") {

              expr = node$0.expression;

              // Rest parameters can only be identifiers
              if (expr.type !== "Identifier") this.fail("Invalid rest parameter", expr);

              this.checkBindingTarget(expr);

              // Clear parser error for invalid spread expression
              node$0.error = "";

              param$0 = new AST.RestParameter(expr, node$0.start, node$0.end);

            } else {

              param$0 = new AST.FormalParameter(node$0, null, node$0.start, node$0.end);
              this.transformPatternElement(param$0, true);
            }

            list[i$0] = param$0;
          }

          return list;
        }
      });

      __({
        transformArrayPattern: function(node, binding) {

          // NOTE: ArrayPattern and ArrayLiteral are isomorphic
          node.type = "ArrayPattern";

          var elems = node.elements;

          for (var i$1 = 0; i$1 < elems.length; ++i$1) {

            var elem$0 = elems[i$1],
              expr$0;

            // Skip holes in pattern
            if (!elem$0) continue;

            switch (elem$0.type) {

              case "SpreadExpression":

                // Rest element must be in the last position and cannot be followed
                // by a comma
                if (i$1 < elems.length - 1 || node.trailingComma) this.fail("Invalid destructuring pattern", elem$0);

                expr$0 = elem$0.expression;

                // Rest target cannot be a destructuring pattern
                switch (expr$0.type) {

                  case "ObjectLiteral":
                  case "ObjectPattern":
                  case "ArrayLiteral":
                  case "ArrayPattern":
                    this.fail("Invalid rest pattern", expr$0);
                }

                elem$0 = new AST.PatternRestElement(expr$0, elem$0.start, elem$0.end);
                this.checkPatternTarget(elem$0.pattern, binding);
                break;

              case "PatternRestElement":
                this.checkPatternTarget(elem$0.pattern, binding);
                break;

              case "PatternElement":
                this.transformPatternElement(elem$0, binding);
                break;

              default:
                elem$0 = new AST.PatternElement(elem$0, null, elem$0.start, elem$0.end);
                this.transformPatternElement(elem$0, binding);
                break;

            }

            elems[i$1] = elem$0;
          }

        }
      });

      __({
        transformObjectPattern: function(node, binding) {

          // NOTE: ObjectPattern and ObjectLiteral are isomorphic
          node.type = "ObjectPattern";

          var props = node.properties;

          for (var i$2 = 0; i$2 < props.length; ++i$2) {

            var prop$0 = props[i$2];

            // Clear the error flag
            prop$0.error = "";

            switch (prop$0.type) {

              case "PropertyDefinition":

                // Replace node
                props[i$2] = prop$0 = new AST.PatternProperty(
                  prop$0.name,
                  prop$0.expression,
                  null,
                  prop$0.start,
                  prop$0.end);

                break;

              case "PatternProperty":
                break;

              default:
                this.fail("Invalid pattern", prop$0);
            }

            if (prop$0.pattern) this.transformPatternElement(prop$0, binding);
            else this.checkPatternTarget(prop$0.name, binding);
          }
        }
      });

      __({
        transformPatternElement: function(elem, binding) {

          var node = elem.pattern;

          // Split assignment into pattern and initializer
          if (node && node.type === "AssignmentExpression" && node.operator === "=") {

            elem.initializer = node.right;
            elem.pattern = node = node.left;
          }

          this.checkPatternTarget(node, binding);
        }
      });

      __({
        transformIdentifier: function(node) {

          var value = node.value;

          if (isReservedWord(value)) this.fail("Unexpected token " + value, node);

          this.checkIdentifier(node);
        }
      });

      __({
        transformDefaultExport: function(node) {

          var toType = null;

          switch (node.type) {

            case "ClassExpression":
              if (node.identifier) toType = "ClassDeclaration";
              break;

            case "FunctionExpression":
              if (node.identifier) toType = "FunctionDeclaration";
              break;
          }

          if (toType) {

            node.type = toType;
            return true;
          }

          return false;
        }
      });;
      __({
        constructor: function Transform() {}
      });

    });


    exports.Transform = Transform;


  }).call(this, _M26);

  (function(exports) {

    var isStrictReservedWord = _M25.isStrictReservedWord;


    // Returns true if the specified name is a restricted identifier in strict mode
    function isPoisonIdent(name) {

      return name === "eval" || name === "arguments";
    }

    // Unwraps parens surrounding an expression
    function unwrapParens(node) {

      // Remove any parenthesis surrounding the target
      for (; node.type === "ParenExpression"; node = node.expression);
      return node;
    }

    var Validate = _esdown.class(function(__) {

      // Validates an assignment target
      __({
        checkAssignmentTarget: function(node, simple) {

          switch (node.type) {

            case "Identifier":

              if (isPoisonIdent(node.value)) this.addStrictError("Cannot modify " + node.value + " in strict mode", node);

              return;

            case "MemberExpression":
            case "AtName":
              return;

            case "ObjectPattern":
            case "ArrayPattern":
              if (!simple) return;
              break;

            case "ObjectLiteral":
              if (!simple) {
                this.transformObjectPattern(node, false);
                return
              }
              break;

            case "ArrayLiteral":
              if (!simple) {
                this.transformArrayPattern(node, false);
                return
              }
              break;

          }

          this.fail("Invalid left-hand side in assignment", node);
        }
      });

      // Validates a binding target
      __({
        checkBindingTarget: function(node) {

          switch (node.type) {

            case "Identifier":

              // Perform basic identifier validation
              this.checkIdentifier(node);

              // Mark identifier node as a declaration
              node.context = "declaration";

              var name$0 = node.value;

              if (isPoisonIdent(name$0)) this.addStrictError("Binding cannot be created for '" + name$0 + "' in strict mode", node);

              return;

            case "ArrayLiteral":
            case "ArrayPattern":
              this.transformArrayPattern(node, true);
              return;

            case "ObjectLiteral":
            case "ObjectPattern":
              this.transformObjectPattern(node, true);
              return;

          }

          this.fail("Invalid binding target", node);
        }
      });

      // Validates a target in a binding or assignment pattern
      __({
        checkPatternTarget: function(node, binding) {

          return binding ? this.checkBindingTarget(node) : this.checkAssignmentTarget(node, false);
        }
      });

      // Checks an identifier for strict mode reserved words
      __({
        checkIdentifier: function(node) {

          var ident = node.value;

          if (ident === "yield" && this.context.isGenerator) this.fail("yield cannot be an identifier inside of a generator function", node);
          else if (ident === "await" && this.context.isAsync) this.fail("await cannot be an identifier inside of an async function", node);
          else if (isStrictReservedWord(ident)) this.addStrictError(ident + " cannot be used as an identifier in strict mode", node);
        }
      });

      // Checks function formal parameters for strict mode restrictions
      __({
        checkParameters: function(params, kind) {

          for (var i$0 = 0; i$0 < params.length; ++i$0) {

            var node$0 = params[i$0];

            if (node$0.type !== "FormalParameter" || node$0.pattern.type !== "Identifier") continue;

            var name$1 = node$0.pattern.value;

            if (isPoisonIdent(name$1)) this.addStrictError("Parameter name " + name$1 + " is not allowed in strict mode", node$0);
          }
        }
      });

      // Performs validation on transformed arrow formal parameters
      __({
        checkArrowParameters: function(params) {

          params = this.transformFormals(params);
          // TODO: Check that formal parameters do not contain yield expressions or
          // await expressions
          this.checkParameters(params);
          return params;
        }
      });

      // Performs validation on the init portion of a for-in or for-of statement
      __({
        checkForInit: function(init, type) {

          if (init.type === "VariableDeclaration") {

            // For-in/of may only have one variable declaration
            if (init.declarations.length !== 1) this.fail("for-" + type + " statement may not have more than one variable declaration", init);

            var decl$0 = init.declarations[0];

            // Initializers are not allowed in for in and for of
            if (decl$0.initializer) this.fail("Invalid initializer in for-" + type + " statement", init);

          } else {

            this.checkAssignmentTarget(this.unwrapParens(init));
          }
        }
      });

      __({
        checkInvalidNodes: function() {

          var context = this.context,
            parent = context.parent,
            list = context.invalidNodes;

          for (var i$1 = 0; i$1 < list.length; ++i$1) {

            var item$0 = list[i$1],
              node$1 = item$0.node,
              error$0 = node$1.error;

            // Skip if error has been resolved
            if (!error$0) continue;

            // Throw if item is not a strict-mode-only error, or if the current
            // context is strict
            if (!item$0.strict || context.mode === "strict") this.fail(error$0, node$1);

            // Skip strict errors in sloppy mode
            if (context.mode === "sloppy") continue;

            // If the parent context is sloppy, then we ignore. If the parent context
            // is strict, then this context would also be known to be strict and
            // therefore handled above.

            // If parent mode has not been determined, add error to
            // parent context
            if (!parent.mode) parent.invalidNodes.push(item$0);
          }

        }
      });

      __({
        checkDelete: function(node) {

          node = this.unwrapParens(node);

          if (node.type === "Identifier") this.addStrictError("Cannot delete unqualified property in strict mode", node);
        }
      });;
      __({
        constructor: function Validate() {}
      });

    });

    exports.Validate = Validate;


  }).call(this, _M27);

  (function(exports) {

    var AST = _M24;
    var Scanner = _M25.Scanner;
    var Transform = _M26.Transform;
    var Validate = _M27.Validate;

    // Returns true if the specified operator is an increment operator
    function isIncrement(op) {

      return op === "++" || op === "--";
    }

    // Returns a binary operator precedence level
    function getPrecedence(op) {

      switch (op) {

        case "||":
          return 1;
        case "&&":
          return 2;
        case "|":
          return 3;
        case "^":
          return 4;
        case "&":
          return 5;
        case "==":
        case "!=":
        case "===":
        case "!==":
          return 6;
        case "<=":
        case ">=":
        case ">":
        case "<":
        case "instanceof":
        case "in":
          return 7;
        case ">>>":
        case ">>":
        case "<<":
          return 8;
        case "+":
        case "-":
          return 9;
        case "*":
        case "/":
        case "%":
          return 10;
      }

      return 0;
    }

    // Returns true if the specified operator is an assignment operator
    function isAssignment(op) {

      if (op === "=") return true;

      switch (op) {

        case "*=":
        case "&=":
        case "^=":
        case "|=":
        case "<<=":
        case ">>=":
        case ">>>=":
        case "%=":
        case "+=":
        case "-=":
        case "/=":
          return true;
      }

      return false;
    }

    // Returns true if the specified operator is a unary operator
    function isUnary(op) {

      switch (op) {

        case "await":
        case "delete":
        case "void":
        case "typeof":
        case "!":
        case "~":
        case "+":
        case "-":
          return true;
      }

      return false;
    }

    // Returns true if the value is a function modifier keyword
    function isFunctionModifier(value) {

      return value === "async";
    }

    // Returns true if the value is a generator function modifier keyword
    function isGeneratorModifier(value) {

      return value === "async" || value === "";
    }

    // Returns true if the value is a method definition keyword
    function isMethodKeyword(value) {

      switch (value) {

        case "get":
        case "set":
        case "static":
          return true;
      }

      return false;
    }

    // Returns true if the supplied meta property pair is valid
    function isValidMeta(left, right) {

      switch (left) {

        case "new":
          return right === "target";
      }

      return false;
    }

    // Returns true if the value is a known directive
    function isDirective(value) {

      return value === "use strict";
    }

    // Returns the value of the specified token, if it is an identifier and does not
    // contain any unicode escapes
    function keywordFromToken(token) {

      if (token.type === "IDENTIFIER" && token.end - token.start === token.value.length) return token.value;

      return "";
    }

    // Returns the value of the specified node, if it is an Identifier and does not
    // contain any unicode escapes
    function keywordFromNode(node) {

      if (node.type === "Identifier" && node.end - node.start === node.value.length) return node.value;

      return "";
    }

    // Copies token data
    function copyToken(from, to) {

      to.type = from.type;
      to.value = from.value;
      to.number = from.number;
      to.regexFlags = from.regexFlags;
      to.templateEnd = from.templateEnd;
      to.newlineBefore = from.newlineBefore;
      to.strictError = from.strictError;
      to.start = from.start;
      to.end = from.end;

      return to;
    }

    var Context = _esdown.class(function(__) {

      __({
        constructor: function Context(parent) {

          this.parent = parent;
          this.mode = "";
          this.isFunction = false;
          this.functionBody = false;
          this.isGenerator = false;
          this.isAsync = false;
          this.isMethod = false;
          this.isConstructor = false;
          this.hasYieldAwait = false;
          this.labelMap = null;
          this.switchDepth = 0;
          this.loopDepth = 0;
          this.invalidNodes = [];
        }
      });
    });

    var ParseResult = _esdown.class(function(__) {

      __({
        constructor: function ParseResult(input, lineMap, ast) {

          this.input = input;
          this.lineMap = lineMap;
          this.ast = ast;
          this.scopeTree = null;
        }
      });

      __({
        locate: function(offset) {

          return this.lineMap.locate(offset);
        }
      });

      __({
        createSyntaxError: function(message, node) {

          var loc = this.lineMap.locate(node.start),
            err = new SyntaxError(message);

          err.line = loc.line;
          err.column = loc.column;
          err.lineOffset = loc.lineOffset;
          err.startOffset = node.start;
          err.endOffset = node.end;
          err.sourceText = this.input;

          return err;
        }
      });

    });

    var Parser = _esdown.class(function(__) {

      __({
        parse: function(input, options) {

          options = options || {};

          var scanner = new Scanner(input);

          this.scanner = scanner;
          this.input = input;

          this.peek0 = null;
          this.peek1 = null;
          this.tokenStash = new Scanner;
          this.tokenEnd = scanner.offset;

          this.context = new Context(null, false);
          this.setStrict(false);

          var ast = options.module ? this.Module() : this.Script();

          return new ParseResult(this.input, this.scanner.lineMap, ast);
        }
      });

      __({
        nextToken: function(context) {

          var scanner = this.scanner,
            type = "";

          context = context || "";

          do {
            type = scanner.next(context);
          }
          while (type === "COMMENT");

          return scanner;
        }
      });

      __({
        nodeStart: function() {

          if (this.peek0) return this.peek0.start;

          // Skip over whitespace and comments
          this.scanner.skip();

          return this.scanner.offset;
        }
      });

      __({
        nodeEnd: function() {

          return this.tokenEnd;
        }
      });

      __({
        readToken: function(type, context) {

          var token = this.peek0 || this.nextToken(context);

          this.peek0 = this.peek1;
          this.peek1 = null;
          this.tokenEnd = token.end;

          if (type && token.type !== type) this.unexpected(token);

          return token;
        }
      });

      __({
        read: function(type, context) {

          return this.readToken(type, context).type;
        }
      });

      __({
        peekToken: function(context) {

          if (!this.peek0) this.peek0 = this.nextToken(context);

          return this.peek0;
        }
      });

      __({
        peek: function(context) {

          return this.peekToken(context).type;
        }
      });

      __({
        peekTokenAt: function(context, index) {

          if (index !== 1 || this.peek0 === null) throw new Error("Invalid lookahead")

          if (this.peek1 === null) {

            this.peek0 = copyToken(this.peek0, this.tokenStash);
            this.peek1 = this.nextToken(context);
          }

          return this.peek1;
        }
      });

      __({
        peekAt: function(context, index) {

          return this.peekTokenAt(context, index).type;
        }
      });

      __({
        unpeek: function() {

          if (this.peek0) {

            this.scanner.offset = this.peek0.start;
            this.peek0 = null;
            this.peek1 = null;
          }
        }
      });

      __({
        peekUntil: function(type, context) {

          var tok = this.peek(context);
          return tok !== "EOF" && tok !== type ? tok : null;
        }
      });

      __({
        readKeyword: function(word) {

          var token = this.readToken();

          if (token.type === word || keywordFromToken(token) === word) return token;

          this.unexpected(token);
        }
      });

      __({
        peekKeyword: function(word) {

          var token = this.peekToken();
          return token.type === word || keywordFromToken(token) === word;
        }
      });

      __({
        peekLet: function() {

          if (this.peekKeyword("let")) {

            switch (this.peekAt("div", 1)) {

              case "{":
              case "[":
              case "IDENTIFIER":
                return true;
            }
          }

          return false;
        }
      });

      __({
        peekYield: function() {

          return this.context.functionBody && this.context.isGenerator && this.peekKeyword("yield");
        }
      });

      __({
        peekAwait: function() {

          if (this.peekKeyword("await")) {

            if (this.context.functionBody && this.context.isAsync) return true;

            if (this.isModule) this.fail("Await is reserved within modules");
          }

          return false;
        }
      });

      __({
        peekFunctionModifier: function() {

          var token = this.peekToken();

          if (!isFunctionModifier(keywordFromToken(token))) return false;

          token = this.peekTokenAt("div", 1);
          return token.type === "function" && !token.newlineBefore;
        }
      });

      __({
        peekEnd: function() {

          var token = this.peekToken();

          if (!token.newlineBefore) {

            switch (token.type) {

              case "EOF":
              case "}":
              case ";":
              case ")":
                break;

              default:
                return false;
            }
          }

          return true;
        }
      });

      __({
        unexpected: function(token) {

          var type = token.type,
            msg;

          msg = type === "EOF" ? "Unexpected end of input" : "Unexpected token " + token.type;

          this.fail(msg, token);
        }
      });

      __({
        fail: function(msg, node) {

          if (!node) node = this.peekToken();

          var result = new ParseResult(this.input, this.scanner.lineMap, null);
          throw result.createSyntaxError(msg, node);
        }
      });

      __({
        unwrapParens: function(node) {

          // Remove any parenthesis surrounding the target
          for (; node.type === "ParenExpression"; node = node.expression);
          return node;
        }
      });


      // == Context Management ==

      __({
        pushContext: function(isArrow) {

          var parent = this.context,
            c = new Context(parent);

          this.context = c;

          if (parent.mode === "strict") c.mode = "strict";

          if (isArrow) {

            c.isMethod = parent.isMethod;
            c.isConstructor = parent.isConstructor;
          }

          return c;
        }
      });

      __({
        pushMaybeContext: function() {

          var parent = this.context,
            c = this.pushContext();

          c.isFunction = parent.isFunction;
          c.isGenerator = parent.isGenerator;
          c.isAsync = parent.isAsync;
          c.isMethod = parent.isMethod;
          c.isConstructor = parent.isConstructor;
          c.functionBody = parent.functionBody;
        }
      });

      __({
        popContext: function(collapse) {

          var context = this.context,
            parent = context.parent;

          // If collapsing into parent context, copy invalid nodes into parent
          if (collapse) context.invalidNodes.forEach(function(node) {
            return parent.invalidNodes.push(node);
          });
          else this.checkInvalidNodes();

          this.context = this.context.parent;
        }
      });

      __({
        setStrict: function(strict) {

          this.context.mode = strict ? "strict" : "sloppy";
        }
      });

      __({
        addStrictError: function(error, node) {

          this.addInvalidNode(error, node, true);
        }
      });

      __({
        addInvalidNode: function(error, node, strict) {

          node.error = error;
          this.context.invalidNodes.push({
            node: node,
            strict: !! strict
          });
        }
      });

      __({
        setLabel: function(label, value) {

          var m = this.context.labelMap;

          if (!m) m = this.context.labelMap = Object.create(null);

          m[label] = value;
        }
      });

      __({
        getLabel: function(label) {

          var m = this.context.labelMap;
          return (m && m[label]) | 0;
        }
      });

      __({
        setFunctionType: function(kind) {

          var c = this.context,
            a = false,
            g = false;

          switch (kind) {

            case "async":
              a = true;
              break;
            case "generator":
              g = true;
              break;
            case "async-generator":
              a = g = true;
              break;
          }

          c.isFunction = true;
          c.isAsync = a;
          c.isGenerator = g;
        }
      });

      // === Top Level ===

      __({
        Script: function() {

          this.isModule = false;
          this.pushContext();

          var start = this.nodeStart(),
            statements = this.StatementList(true, false);

          this.popContext();

          return new AST.Script(statements, start, this.nodeEnd());
        }
      });

      __({
        Module: function() {

          this.isModule = true;
          this.pushContext();
          this.setStrict(true);

          var start = this.nodeStart(),
            statements = this.StatementList(true, true);

          this.popContext();

          return new AST.Module(statements, start, this.nodeEnd());
        }
      });

      // === Expressions ===

      __({
        Expression: function(noIn) {

          var expr = this.AssignmentExpression(noIn),
            list = null;

          while (this.peek("div") === ",") {

            this.read();

            if (list === null) expr = new AST.SequenceExpression(list = [expr], expr.start, - 1);

            list.push(this.AssignmentExpression(noIn));
          }

          if (list) expr.end = this.nodeEnd();

          return expr;
        }
      });

      __({
        AssignmentExpression: function(noIn, allowSpread) {

          var start = this.nodeStart(),
            node;

          if (this.peek() === "...") {

            this.read();

            node = new AST.SpreadExpression(
              this.AssignmentExpression(noIn),
              start,
              this.nodeEnd());

            if (!allowSpread) this.addInvalidNode("Invalid spread expression", node);

            return node;
          }

          if (this.peekYield()) return this.YieldExpression(noIn);

          node = this.ConditionalExpression(noIn);

          if (node.type === "ArrowFunctionHead") return this.ArrowFunctionBody(node, noIn);

          // Check for assignment operator
          if (!isAssignment(this.peek("div"))) return node;

          this.checkAssignmentTarget(this.unwrapParens(node), false);

          return new AST.AssignmentExpression(
            this.read(),
            node,
            this.AssignmentExpression(noIn),
            start,
            this.nodeEnd());
        }
      });

      __({
        YieldExpression: function(noIn) {

          var start = this.nodeStart(),
            delegate = false,
            expr = null;

          this.readKeyword("yield");

          if (!this.peekEnd() && this.peek() !== ",") {

            if (this.peek() === "*") {

              this.read();
              delegate = true;
            }

            expr = this.AssignmentExpression(noIn);
          }

          this.context.hasYieldAwait = true;

          return new AST.YieldExpression(
            expr,
            delegate,
            start,
            this.nodeEnd());
        }
      });

      __({
        ConditionalExpression: function(noIn) {

          var start = this.nodeStart(),
            left = this.BinaryExpression(noIn),
            middle,
            right;

          if (this.peek("div") !== "?") return left;

          this.read("?");
          middle = this.AssignmentExpression();
          this.read(":");
          right = this.AssignmentExpression(noIn);

          return new AST.ConditionalExpression(left, middle, right, start, this.nodeEnd());
        }
      });

      __({
        BinaryExpression: function(noIn) {

          return this.PartialBinaryExpression(this.UnaryExpression(), 0, noIn);
        }
      });

      __({
        PartialBinaryExpression: function(lhs, minPrec, noIn) {

          var prec = 0,
            next = "",
            max = 0,
            op = "",
            rhs;

          while (next = this.peek("div")) {

            // Exit if operator is "in" and in is not allowed
            if (next === "in" && noIn) break;

            prec = getPrecedence(next);

            // Exit if not a binary operator or lower precendence
            if (prec === 0 || prec < minPrec) break;

            this.read();

            op = next;
            max = prec;
            rhs = this.UnaryExpression();

            while (next = this.peek("div")) {

              prec = getPrecedence(next);

              // Exit if not a binary operator or equal or higher precendence
              if (prec === 0 || prec <= max) break;

              rhs = this.PartialBinaryExpression(rhs, prec, noIn);
            }

            lhs = new AST.BinaryExpression(op, lhs, rhs, lhs.start, rhs.end);
          }

          return lhs;
        }
      });

      __({
        UnaryExpression: function() {

          var start = this.nodeStart(),
            type = this.peek(),
            token,
            expr;

          if (isIncrement(type)) {

            this.read();
            expr = this.MemberExpression(true);
            this.checkAssignmentTarget(this.unwrapParens(expr), true);

            return new AST.UpdateExpression(type, expr, true, start, this.nodeEnd());
          }

          if (this.peekAwait()) {

            type = "await";
            this.context.hasYieldAwait = true;
          }

          if (isUnary(type)) {

            this.read();
            expr = this.UnaryExpression();

            if (type === "delete") this.checkDelete(expr);

            return new AST.UnaryExpression(type, expr, start, this.nodeEnd());
          }

          expr = this.MemberExpression(true);
          token = this.peekToken("div");
          type = token.type;

          // Check for postfix operator
          if (isIncrement(type) && !token.newlineBefore) {

            this.read();
            this.checkAssignmentTarget(this.unwrapParens(expr), true);

            return new AST.UpdateExpression(type, expr, false, start, this.nodeEnd());
          }

          return expr;
        }
      });

      __({
        MemberExpression: function(allowCall) {

          var token = this.peekToken(),
            start = token.start,
            arrowType = "",
            isSuper = false,
            exit = false,
            expr,
            prop;

          switch (token.type) {

            case "super":

              expr = this.SuperKeyword();
              isSuper = true;
              break;

            case "new":

              expr = this.peekAt("", 1) === "." ? this.MetaProperty() : this.NewExpression();

              break;

            case "::":

              if (allowCall) {

                expr = null;
                break;
              }

            default:

              expr = this.PrimaryExpression();
              break;
          }

          while (!exit) {

            token = this.peekToken("div");

            switch (token.type) {

              case ".":

                this.read();

                prop = this.peek("name") === "ATNAME" && !isSuper ? this.AtName() : this.IdentifierName();

                expr = new AST.MemberExpression(
                  expr,
                  prop,
                  false,
                  start,
                  this.nodeEnd());

                break;

              case "[":

                this.read();
                prop = this.Expression();
                this.read("]");

                expr = new AST.MemberExpression(
                  expr,
                  prop,
                  true,
                  start,
                  this.nodeEnd());

                break;

              case "(":

                if (isSuper) {

                  if (!allowCall || !this.context.isConstructor) this.fail("Invalid super call");
                }

                if (!allowCall) {

                  exit = true;
                  break;
                }

                if (isFunctionModifier(keywordFromNode(expr))) {

                  arrowType = expr.value;
                  this.pushMaybeContext();
                }

                expr = new AST.CallExpression(
                  expr,
                  this.ArgumentList(),
                  start,
                  this.nodeEnd());

                if (arrowType) {

                  token = this.peekToken("div");

                  if (token.type === "=>" && !token.newlineBefore) {

                    expr = this.ArrowFunctionHead(arrowType, expr, start);
                    exit = true;

                  } else {

                    arrowType = "";
                    this.popContext(true);
                  }
                }

                break;

              case "TEMPLATE":

                if (isSuper) this.fail();

                expr = new AST.TaggedTemplateExpression(
                  expr,
                  this.TemplateExpression(),
                  start,
                  this.nodeEnd());

                break;

              case "::":

                if (isSuper) this.fail();

                if (!allowCall) {

                  exit = true;
                  break;
                }

                this.read();

                expr = new AST.BindExpression(
                  expr,
                  this.MemberExpression(false),
                  start,
                  this.nodeEnd());

                break;

              default:

                if (isSuper) this.fail();

                exit = true;
                break;
            }

            isSuper = false;
          }

          return expr;
        }
      });

      __({
        NewExpression: function() {

          var start = this.nodeStart();

          this.read("new");

          var expr = this.MemberExpression(false),
            args = this.peek("div") === "(" ? this.ArgumentList() : null;

          return new AST.NewExpression(expr, args, start, this.nodeEnd());
        }
      });

      __({
        MetaProperty: function() {

          var token = this.readToken(),
            start = token.start,
            left = token.type === "IDENTIFIER" ? token.value : token.type,
            right;

          this.read(".");

          token = this.readToken("IDENTIFIER", "name");
          right = token.value;

          if (!isValidMeta(left, right)) this.fail("Invalid meta property", token);

          return new AST.MetaProperty(left, right, start, this.nodeEnd());
        }
      });

      __({
        SuperKeyword: function() {

          var token = this.readToken("super"),
            node = new AST.SuperKeyword(token.start, token.end);

          if (!this.context.isMethod) this.fail("Super keyword outside of method", node);

          return node;
        }
      });

      __({
        ArgumentList: function() {

          var list = [];

          this.read("(");

          while (this.peekUntil(")")) {

            if (list.length > 0) this.read(",");

            list.push(this.AssignmentExpression(false, true));
          }

          this.read(")");

          return list;
        }
      });

      __({
        PrimaryExpression: function() {

          var token = this.peekToken(),
            type = token.type,
            start = this.nodeStart(),
            next,
            value;

          switch (type) {

            case "function":
              return this.FunctionExpression();
            case "class":
              return this.ClassExpression();
            case "TEMPLATE":
              return this.TemplateExpression();
            case "NUMBER":
              return this.NumberLiteral();
            case "STRING":
              return this.StringLiteral();
            case "{":
              return this.ObjectLiteral();
            case "(":
              return this.ParenExpression();
            case "[":
              return this.ArrayLiteral();
            case "ATNAME":
              return this.AtName();

            case "IDENTIFIER":

              value = keywordFromToken(token);
              next = this.peekTokenAt("div", 1);

              if (!next.newlineBefore) {

                if (next.type === "=>") {

                  this.pushContext(true);
                  return this.ArrowFunctionHead("", this.BindingIdentifier(), start);

                } else if (next.type === "function") {

                  return this.FunctionExpression();

                } else if (next.type === "IDENTIFIER" && isFunctionModifier(value)) {

                  this.read();
                  this.pushContext(true);
                  return this.ArrowFunctionHead(value, this.BindingIdentifier(), start);
                }
              }

              return this.Identifier(true);

            case "REGEX":
              return this.RegularExpression();

            case "null":
              this.read();
              return new AST.NullLiteral(token.start, token.end);

            case "true":
            case "false":
              this.read();
              return new AST.BooleanLiteral(type === "true", token.start, token.end);

            case "this":
              this.read();
              return new AST.ThisExpression(token.start, token.end);
          }

          this.unexpected(token);
        }
      });

      __({
        Identifier: function(isVar) {

          var token = this.readToken("IDENTIFIER"),
            node = new AST.Identifier(token.value, isVar ? "variable" : "", token.start, token.end);

          this.checkIdentifier(node);
          return node;
        }
      });

      __({
        IdentifierName: function() {

          var token = this.readToken("IDENTIFIER", "name");
          return new AST.Identifier(token.value, "", token.start, token.end);
        }
      });

      __({
        AtName: function() {

          // TODO:  Only allow within class?  What about nested classes?

          var token = this.readToken("ATNAME");
          return new AST.AtName(token.value, token.start, token.end);
        }
      });

      __({
        StringLiteral: function() {

          var token = this.readToken("STRING"),
            node = new AST.StringLiteral(token.value, token.start, token.end);

          if (token.strictError) this.addStrictError(token.strictError, node);

          return node;
        }
      });

      __({
        NumberLiteral: function() {

          var token = this.readToken("NUMBER"),
            node = new AST.NumberLiteral(token.number, token.start, token.end);

          if (token.strictError) this.addStrictError(token.strictError, node);

          return node;
        }
      });

      __({
        TemplatePart: function() {

          var token = this.readToken("TEMPLATE", "template"),
            end = token.templateEnd,
            node;

          node = new AST.TemplatePart(
            token.value,
            this.scanner.rawValue(token.start + 1, token.end - (end ? 1 : 2)),
            end,
            token.start,
            token.end);

          if (token.strictError) this.addStrictError(token.strictError, node);

          return node;
        }
      });

      __({
        RegularExpression: function() {

          // TODO:  Validate regular expression against RegExp grammar (21.2.1)
          var token = this.readToken("REGEX");

          return new AST.RegularExpression(
            token.value,
            token.regexFlags,
            token.start,
            token.end);
        }
      });

      __({
        BindingIdentifier: function() {

          var token = this.readToken("IDENTIFIER"),
            node = new AST.Identifier(token.value, "", token.start, token.end);

          this.checkBindingTarget(node);
          return node;
        }
      });

      __({
        BindingPattern: function() {

          var node;

          switch (this.peek()) {

            case "{":
              node = this.ObjectLiteral();
              break;

            case "[":
              node = this.ArrayLiteral();
              break;

            default:
              return this.BindingIdentifier();
          }

          this.checkBindingTarget(node);
          return node;
        }
      });

      __({
        ParenExpression: function() {

          var start = this.nodeStart(),
            next = null,
            rest = null;

          // Push a new context in case we are parsing an arrow function
          this.pushMaybeContext();

          this.read("(");

          if (this.peek() === ")") {

            next = this.peekTokenAt("", 1);

            if (next.newlineBefore || next.type !== "=>") this.fail();

            this.read(")");

            return this.ArrowFunctionHead("", null, start);
          }

          var expr = this.Expression();

          this.read(")");
          next = this.peekToken("div");

          if (!next.newlineBefore && next.type === "=>") return this.ArrowFunctionHead("", expr, start);

          // Collapse this context into its parent
          this.popContext(true);

          return new AST.ParenExpression(expr, start, this.nodeEnd());
        }
      });

      __({
        ObjectLiteral: function() {

          var start = this.nodeStart(),
            comma = false,
            list = [],
            node;

          this.read("{");

          while (this.peekUntil("}", "name")) {

            if (!comma && node) {

              this.read(",");
              comma = true;

            } else {

              comma = false;
              list.push(node = this.PropertyDefinition());
            }
          }

          this.read("}");

          return new AST.ObjectLiteral(list, comma, start, this.nodeEnd());
        }
      });

      __({
        PropertyDefinition: function() {

          if (this.peek("name") === "*") return this.MethodDefinition();

          var start = this.nodeStart(),
            node,
            name;

          switch (this.peekAt("name", 1)) {

            case "=":

              // Re-read token as an identifier
              this.unpeek();

              node = new AST.PatternProperty(
                this.Identifier(true),
                null, (this.read(), this.AssignmentExpression()),
                start,
                this.nodeEnd());

              this.addInvalidNode("Invalid property definition in object literal", node);
              return node;

            case ",":
            case "}":

              // Re-read token as an identifier
              this.unpeek();

              return new AST.PropertyDefinition(
                this.Identifier(true),
                null,
                start,
                this.nodeEnd());
          }

          name = this.PropertyName();

          if (this.peek("name") === ":") {

            return new AST.PropertyDefinition(
              name, (this.read(), this.AssignmentExpression()),
              start,
              this.nodeEnd());
          }

          return this.MethodDefinition(name);
        }
      });

      __({
        PropertyName: function() {

          var token = this.peekToken("name");

          switch (token.type) {

            case "IDENTIFIER":
              return this.IdentifierName();
            case "STRING":
              return this.StringLiteral();
            case "NUMBER":
              return this.NumberLiteral();
            case "[":
              return this.ComputedPropertyName();
          }

          this.unexpected(token);
        }
      });

      __({
        ComputedPropertyName: function() {

          var start = this.nodeStart();

          this.read("[");
          var expr = this.AssignmentExpression();
          this.read("]");

          return new AST.ComputedPropertyName(expr, start, this.nodeEnd());
        }
      });

      __({
        ArrayLiteral: function() {

          var start = this.nodeStart(),
            comma = false,
            list = [],
            type;

          this.read("[");

          while (type = this.peekUntil("]")) {

            if (type === ",") {

              this.read();
              comma = true;
              list.push(null);

            } else {

              list.push(this.AssignmentExpression(false, true));
              comma = false;

              if (this.peek() !== "]") {

                this.read(",");
                comma = true;
              }
            }
          }

          this.read("]");

          return new AST.ArrayLiteral(list, comma, start, this.nodeEnd());
        }
      });

      __({
        TemplateExpression: function() {

          var atom = this.TemplatePart(),
            start = atom.start,
            lit = [atom],
            sub = [];

          while (!atom.templateEnd) {

            sub.push(this.Expression());

            // Discard any tokens that have been scanned using a different context
            this.unpeek();

            lit.push(atom = this.TemplatePart());
          }

          return new AST.TemplateExpression(lit, sub, start, this.nodeEnd());
        }
      });

      // === Statements ===

      __({
        Statement: function(label) {

          var next;

          switch (this.peek()) {

            case "IDENTIFIER":

              if (this.peekAt("div", 1) === ":") return this.LabelledStatement();

              return this.ExpressionStatement();

            case "{":
              return this.Block();
            case ";":
              return this.EmptyStatement();
            case "var":
              return this.VariableStatement();
            case "return":
              return this.ReturnStatement();
            case "break":
              return this.BreakStatement();
            case "continue":
              return this.ContinueStatement();
            case "throw":
              return this.ThrowStatement();
            case "debugger":
              return this.DebuggerStatement();
            case "if":
              return this.IfStatement();
            case "do":
              return this.DoWhileStatement(label);
            case "while":
              return this.WhileStatement(label);
            case "for":
              return this.ForStatement(label);
            case "with":
              return this.WithStatement();
            case "switch":
              return this.SwitchStatement();
            case "try":
              return this.TryStatement();

            default:
              return this.ExpressionStatement();
          }
        }
      });

      __({
        Block: function() {

          var start = this.nodeStart();

          this.read("{");
          var list = this.StatementList(false, false);
          this.read("}");

          return new AST.Block(list, start, this.nodeEnd());
        }
      });

      __({
        Semicolon: function() {

          var token = this.peekToken(),
            type = token.type;

          if (type === ";" || !(type === "}" || type === "EOF" || token.newlineBefore)) this.read(";");
        }
      });

      __({
        LabelledStatement: function() {

          var start = this.nodeStart(),
            label = this.Identifier(),
            name = label.value;

          if (this.getLabel(name) > 0) this.fail("Invalid label", label);

          this.read(":");

          this.setLabel(name, 1);
          var statement = this.Statement(name);
          this.setLabel(name, 0);

          return new AST.LabelledStatement(
            label,
            statement,
            start,
            this.nodeEnd());
        }
      });

      __({
        ExpressionStatement: function() {

          var start = this.nodeStart(),
            expr = this.Expression();

          this.Semicolon();

          return new AST.ExpressionStatement(expr, start, this.nodeEnd());
        }
      });

      __({
        EmptyStatement: function() {

          var start = this.nodeStart();

          this.Semicolon();

          return new AST.EmptyStatement(start, this.nodeEnd());
        }
      });

      __({
        VariableStatement: function() {

          var node = this.VariableDeclaration(false);

          this.Semicolon();
          node.end = this.nodeEnd();

          return node;
        }
      });

      __({
        VariableDeclaration: function(noIn) {

          var start = this.nodeStart(),
            token = this.peekToken(),
            kind = token.type,
            list = [];

          switch (kind) {

            case "var":
            case "const":
              break;

            case "IDENTIFIER":

              if (token.value === "let") {

                kind = "let";
                break;
              }

            default:
              this.fail("Expected var, const, or let");
          }

          this.read();

          while (true) {

            list.push(this.VariableDeclarator(noIn, kind));

            if (this.peek() === ",") this.read();
            else break;
          }

          return new AST.VariableDeclaration(kind, list, start, this.nodeEnd());
        }
      });

      __({
        VariableDeclarator: function(noIn, kind) {

          var start = this.nodeStart(),
            pattern = this.BindingPattern(),
            init = null;

          if ((!noIn && pattern.type !== "Identifier") || this.peek() === "=") {

            // NOTE: Patterns must have initializers when not in declaration
            // section of a for statement

            this.read();
            init = this.AssignmentExpression(noIn);

          } else if (kind === "const") {

            this.fail("Missing const initializer", pattern);
          }

          return new AST.VariableDeclarator(pattern, init, start, this.nodeEnd());
        }
      });

      __({
        ReturnStatement: function() {

          if (!this.context.isFunction) this.fail("Return statement outside of function");

          var start = this.nodeStart();

          this.read("return");
          var value = this.peekEnd() ? null : this.Expression();

          this.Semicolon();

          return new AST.ReturnStatement(value, start, this.nodeEnd());
        }
      });

      __({
        BreakStatement: function() {

          var start = this.nodeStart(),
            context = this.context;

          this.read("break");
          var label = this.peekEnd() ? null : this.Identifier();
          this.Semicolon();

          var node = new AST.BreakStatement(label, start, this.nodeEnd());

          if (label) {

            if (this.getLabel(label.value) === 0) this.fail("Invalid label", label);

          } else if (context.loopDepth === 0 && context.switchDepth === 0) {

            this.fail("Break not contained within a switch or loop", node);
          }

          return node;
        }
      });

      __({
        ContinueStatement: function() {

          var start = this.nodeStart(),
            context = this.context;

          this.read("continue");
          var label = this.peekEnd() ? null : this.Identifier();
          this.Semicolon();

          var node = new AST.ContinueStatement(label, start, this.nodeEnd());

          if (label) {

            if (this.getLabel(label.value) !== 2) this.fail("Invalid label", label);

          } else if (context.loopDepth === 0) {

            this.fail("Continue not contained within a loop", node);
          }

          return node;
        }
      });

      __({
        ThrowStatement: function() {

          var start = this.nodeStart();

          this.read("throw");

          var expr = this.peekEnd() ? null : this.Expression();

          if (expr === null) this.fail("Missing throw expression");

          this.Semicolon();

          return new AST.ThrowStatement(expr, start, this.nodeEnd());
        }
      });

      __({
        DebuggerStatement: function() {

          var start = this.nodeStart();

          this.read("debugger");
          this.Semicolon();

          return new AST.DebuggerStatement(start, this.nodeEnd());
        }
      });

      __({
        IfStatement: function() {

          var start = this.nodeStart();

          this.read("if");
          this.read("(");

          var test = this.Expression(),
            body = null,
            elseBody = null;

          this.read(")");
          body = this.Statement();

          if (this.peek() === "else") {

            this.read();
            elseBody = this.Statement();
          }

          return new AST.IfStatement(test, body, elseBody, start, this.nodeEnd());
        }
      });

      __({
        DoWhileStatement: function(label) {

          var start = this.nodeStart(),
            body,
            test;

          if (label) this.setLabel(label, 2);

          this.read("do");

          this.context.loopDepth += 1;
          body = this.Statement();
          this.context.loopDepth -= 1;

          this.read("while");
          this.read("(");

          test = this.Expression();

          this.read(")");

          return new AST.DoWhileStatement(body, test, start, this.nodeEnd());
        }
      });

      __({
        WhileStatement: function(label) {

          var start = this.nodeStart();

          if (label) this.setLabel(label, 2);

          this.read("while");
          this.read("(");
          var expr = this.Expression();
          this.read(")");

          this.context.loopDepth += 1;
          var statement = this.Statement();
          this.context.loopDepth -= 1;

          return new AST.WhileStatement(
            expr,
            statement,
            start,
            this.nodeEnd());
        }
      });

      __({
        ForStatement: function(label) {

          var start = this.nodeStart(),
            init = null,
            async = false,
            test,
            step;

          if (label) this.setLabel(label, 2);

          this.read("for");

          if (this.context.isAsync && this.peekKeyword("async")) {

            this.read();
            async = true;
          }

          this.read("(");

          // Get loop initializer
          switch (this.peek()) {

            case ";":
              break;

            case "var":
            case "const":
              init = this.VariableDeclaration(true);
              break;

            case "IDENTIFIER":

              if (this.peekLet()) {

                init = this.VariableDeclaration(true);
                break;
              }

            default:
              init = this.Expression(true);
              break;
          }

          if (async || init && this.peekKeyword("of")) return this.ForOfStatement(async, init, start);

          if (init && this.peek() === "in") return this.ForInStatement(init, start);

          this.read(";");
          test = this.peek() === ";" ? null : this.Expression();

          this.read(";");
          step = this.peek() === ")" ? null : this.Expression();

          this.read(")");

          this.context.loopDepth += 1;
          var statement = this.Statement();
          this.context.loopDepth -= 1;

          return new AST.ForStatement(
            init,
            test,
            step,
            statement,
            start,
            this.nodeEnd());
        }
      });

      __({
        ForInStatement: function(init, start) {

          this.checkForInit(init, "in");

          this.read("in");
          var expr = this.Expression();
          this.read(")");

          this.context.loopDepth += 1;
          var statement = this.Statement();
          this.context.loopDepth -= 1;

          return new AST.ForInStatement(
            init,
            expr,
            statement,
            start,
            this.nodeEnd());
        }
      });

      __({
        ForOfStatement: function(async, init, start) {

          this.checkForInit(init, "of");

          this.readKeyword("of");
          var expr = this.AssignmentExpression();
          this.read(")");

          this.context.loopDepth += 1;
          var statement = this.Statement();
          this.context.loopDepth -= 1;

          return new AST.ForOfStatement(
            async,
            init,
            expr,
            statement,
            start,
            this.nodeEnd());
        }
      });

      __({
        WithStatement: function() {

          var start = this.nodeStart();

          this.read("with");
          this.read("(");

          var node = new AST.WithStatement(
            this.Expression(), (this.read(")"), this.Statement()),
            start,
            this.nodeEnd());

          this.addStrictError("With statement is not allowed in strict mode", node);

          return node;
        }
      });

      __({
        SwitchStatement: function() {

          var start = this.nodeStart();

          this.read("switch");
          this.read("(");

          var head = this.Expression(),
            hasDefault = false,
            cases = [],
            node;

          this.read(")");
          this.read("{");
          this.context.switchDepth += 1;

          while (this.peekUntil("}")) {

            node = this.SwitchCase();

            if (node.test === null) {

              if (hasDefault) this.fail("Switch statement cannot have more than one default", node);

              hasDefault = true;
            }

            cases.push(node);
          }

          this.context.switchDepth -= 1;
          this.read("}");

          return new AST.SwitchStatement(head, cases, start, this.nodeEnd());
        }
      });

      __({
        SwitchCase: function() {

          var start = this.nodeStart(),
            expr = null,
            list = [],
            type;

          if (this.peek() === "default") {

            this.read();

          } else {

            this.read("case");
            expr = this.Expression();
          }

          this.read(":");

          while (type = this.peekUntil("}")) {

            if (type === "case" || type === "default") break;

            list.push(this.Declaration(false));
          }

          return new AST.SwitchCase(expr, list, start, this.nodeEnd());
        }
      });

      __({
        TryStatement: function() {

          var start = this.nodeStart();

          this.read("try");

          var tryBlock = this.Block(),
            handler = null,
            fin = null;

          if (this.peek() === "catch") handler = this.CatchClause();

          if (this.peek() === "finally") {

            this.read("finally");
            fin = this.Block();
          }

          return new AST.TryStatement(tryBlock, handler, fin, start, this.nodeEnd());
        }
      });

      __({
        CatchClause: function() {

          var start = this.nodeStart();

          this.read("catch");
          this.read("(");
          var param = this.BindingPattern();
          this.read(")");

          return new AST.CatchClause(param, this.Block(), start, this.nodeEnd());
        }
      });

      // === Declarations ===

      __({
        StatementList: function(prologue, isModule) {

          var list = [],
            node,
            expr,
            dir;

          // TODO: is this wrong for braceless statement lists?
          while (this.peekUntil("}")) {

            node = this.Declaration(isModule);

            // Check for directives
            if (prologue) {

              if (node.type === "ExpressionStatement" && node.expression.type === "StringLiteral") {

                // Get the non-escaped literal text of the string
                expr = node.expression;
                dir = this.input.slice(expr.start + 1, expr.end - 1);

                if (isDirective(dir)) {

                  node = new AST.Directive(dir, expr, node.start, node.end);

                  // Check for strict mode
                  if (dir === "use strict") this.setStrict(true);
                }

              } else {

                prologue = false;
              }
            }

            list.push(node);
          }

          return list;
        }
      });

      __({
        Declaration: function(isModule) {

          switch (this.peek()) {

            case "function":
              return this.FunctionDeclaration();
            case "class":
              return this.ClassDeclaration();
            case "const":
              return this.LexicalDeclaration();

            case "import":

              if (isModule) return this.ImportDeclaration();

            case "export":

              if (isModule) return this.ExportDeclaration();

              break;

            case "IDENTIFIER":

              if (this.peekLet()) return this.LexicalDeclaration();

              if (this.peekFunctionModifier()) return this.FunctionDeclaration();

              break;
          }

          return this.Statement();
        }
      });

      __({
        LexicalDeclaration: function() {

          var node = this.VariableDeclaration(false);

          this.Semicolon();
          node.end = this.nodeEnd();

          return node;
        }
      });

      // === Functions ===

      __({
        FunctionDeclaration: function() {

          var start = this.nodeStart(),
            kind = "",
            tok;

          tok = this.peekToken();

          if (isFunctionModifier(keywordFromToken(tok))) {

            this.read();
            kind = tok.value;
          }

          this.read("function");

          if (isGeneratorModifier(kind) && this.peek() === "*") {

            this.read();
            kind = kind ? kind + "-generator" : "generator";
          }

          this.pushContext();
          this.setFunctionType(kind);

          var ident = this.BindingIdentifier(),
            params = this.FormalParameters(),
            body = this.FunctionBody();

          this.checkParameters(params);
          this.popContext();

          return new AST.FunctionDeclaration(
            kind,
            ident,
            params,
            body,
            start,
            this.nodeEnd());
        }
      });

      __({
        FunctionExpression: function() {

          var start = this.nodeStart(),
            ident = null,
            kind = "",
            tok;

          tok = this.peekToken();

          if (isFunctionModifier(keywordFromToken(tok))) {

            this.read();
            kind = tok.value;
          }

          this.read("function");

          if (isGeneratorModifier(kind) && this.peek() === "*") {

            this.read();
            kind = kind ? kind + "-generator" : "generator";
          }

          this.pushContext();
          this.setFunctionType(kind);

          if (this.peek() !== "(") ident = this.BindingIdentifier();

          var params = this.FormalParameters(),
            body = this.FunctionBody();

          this.checkParameters(params);
          this.popContext();

          return new AST.FunctionExpression(
            kind,
            ident,
            params,
            body,
            start,
            this.nodeEnd());
        }
      });

      __({
        MethodDefinition: function(name, classElement) {

          var start = name ? name.start : this.nodeStart(),
            isStatic = false,
            kind = "",
            val;

          if (!name && classElement && this.peekToken("name").value === "static" && this.peekAt("name", 1) !== "(") {

            this.read();
            isStatic = true;
          }

          if (!name && this.peek("name") === "*") {

            this.read();

            kind = "generator";
            name = this.PropertyName();

          } else {

            if (!name) name = this.PropertyName();

            val = keywordFromNode(name);

            if (this.peek("name") !== "(") {

              if (val === "get" || val === "set" || isFunctionModifier(val)) {

                kind = name.value;

                if (isGeneratorModifier(kind) && this.peek("name") === "*") {

                  this.read();
                  kind += "-generator";
                }

                name = this.PropertyName();
              }
            }
          }

          if (classElement) {

            if (isStatic) {

              if (name.type === "Identifier" && name.value === "prototype") this.fail("Invalid prototype property in class definition", name);

            } else if (name.type === "Identifier" && name.value === "constructor") {

              if (kind !== "") this.fail("Invalid constructor property in class definition", name);

              kind = "constructor";
            }
          }

          this.pushContext();
          this.setFunctionType(kind);
          this.context.isMethod = true;
          this.context.isConstructor = kind === "constructor";

          var params = kind === "get" || kind === "set" ? this.AccessorParameters(kind) : this.FormalParameters();

          var body = this.FunctionBody();

          this.checkParameters(params);
          this.popContext();

          return new AST.MethodDefinition(
            isStatic,
            kind,
            name,
            params,
            body,
            start,
            this.nodeEnd());
        }
      });

      __({
        AccessorParameters: function(kind) {

          var list = [];

          this.read("(");

          if (kind === "set") list.push(this.FormalParameter(false));

          this.read(")");

          return list;
        }
      });

      __({
        FormalParameters: function() {

          var list = [];

          this.read("(");

          while (this.peekUntil(")")) {

            if (list.length > 0) this.read(",");

            // Parameter list may have a trailing rest parameter
            if (this.peek() === "...") {

              list.push(this.RestParameter());
              break;
            }

            list.push(this.FormalParameter(true));
          }

          this.read(")");

          return list;
        }
      });

      __({
        FormalParameter: function(allowDefault) {

          var start = this.nodeStart(),
            pattern = this.BindingPattern(),
            init = null;

          if (allowDefault && this.peek() === "=") {

            this.read();
            init = this.AssignmentExpression();
          }

          return new AST.FormalParameter(pattern, init, start, this.nodeEnd());
        }
      });

      __({
        RestParameter: function() {

          var start = this.nodeStart();

          this.read("...");

          return new AST.RestParameter(this.BindingIdentifier(), start, this.nodeEnd());
        }
      });

      __({
        FunctionBody: function() {

          this.context.functionBody = true;

          var start = this.nodeStart();

          this.read("{");
          var statements = this.StatementList(true, false);
          this.read("}");

          return new AST.FunctionBody(statements, start, this.nodeEnd());
        }
      });

      __({
        ArrowFunctionHead: function(kind, formals, start) {

          // Context must have been pushed by caller
          this.setFunctionType(kind);

          if (this.context.hasYieldAwait) this.fail("Invalid yield or await within arrow function head");

          // Transform and validate formal parameters
          var params = this.checkArrowParameters(formals);

          return new AST.ArrowFunctionHead(params, start, this.nodeEnd());
        }
      });

      __({
        ArrowFunctionBody: function(head, noIn) {

          this.read("=>");

          var params = head.parameters,
            start = head.start,
            kind = this.context.isAsync ? "async" : "";

          // Use function body context even if parsing expression body form
          this.context.functionBody = true;

          var body = this.peek() === "{" ? this.FunctionBody() : this.AssignmentExpression(noIn);

          this.popContext();

          return new AST.ArrowFunction(kind, params, body, start, this.nodeEnd());
        }
      });

      // === Classes ===

      __({
        ClassDeclaration: function() {

          var start = this.nodeStart(),
            ident = null,
            base = null;

          this.read("class");

          ident = this.BindingIdentifier();

          if (this.peek() === "extends") {

            this.read();
            base = this.MemberExpression(true);
          }

          return new AST.ClassDeclaration(
            ident,
            base,
            this.ClassBody(),
            start,
            this.nodeEnd());
        }
      });

      __({
        ClassExpression: function() {

          var start = this.nodeStart(),
            ident = null,
            base = null;

          this.read("class");

          if (this.peek() === "IDENTIFIER") ident = this.BindingIdentifier();

          if (this.peek() === "extends") {

            this.read();
            base = this.MemberExpression(true);
          }

          return new AST.ClassExpression(
            ident,
            base,
            this.ClassBody(),
            start,
            this.nodeEnd());
        }
      });

      __({
        ClassBody: function() {

          var start = this.nodeStart(),
            hasConstructor = false,
            list = [];

          this.pushContext();
          this.setStrict(true);
          this.read("{");

          while (this.peekUntil("}", "name")) {

            var elem$0 = this.ClassElement();

            if (elem$0.type === "MethodDefinition" && elem$0.kind === "constructor") {

              if (hasConstructor) this.fail("Duplicate constructor definitions", elem$0.name);

              hasConstructor = true;
            }

            list.push(elem$0);
          }

          this.read("}");
          this.popContext();

          return new AST.ClassBody(list, start, this.nodeEnd());
        }
      });

      __({
        PrivateDeclaration: function() {

          var start = this.nodeStart(),
            name = this.AtName(),
            init = null;

          if (this.peek() === "=") {

            this.read();
            init = this.AssignmentExpression();
          }

          this.Semicolon();

          return new AST.PrivateDeclaration(name, init, start, this.nodeEnd());
        }
      });

      __({
        EmptyClassElement: function() {

          var start = this.nodeStart();

          this.read(";");

          return new AST.EmptyClassElement(start, this.nodeEnd());
        }
      });

      __({
        ClassElement: function() {

          var next = this.peekToken("name");

          if (next.type === ";") return this.EmptyClassElement();

          if (next.type === "ATNAME") return this.PrivateDeclaration();

          if (next.type === "IDENTIFIER" && !isMethodKeyword(next.value) && this.peekAt("name", 1) !== "(") {

            this.unpeek();

            switch (this.peek()) {

              case "class":
                return this.ClassDeclaration();
              case "function":
                return this.FunctionDeclaration();

              case "var":
              case "const":
                return this.LexicalDeclaration();

              case "IDENTIFIER":

                if (this.peekLet()) return this.LexicalDeclaration();

                if (this.peekFunctionModifier()) return this.FunctionDeclaration();
            }

            this.unpeek();
          }

          return this.MethodDefinition(null, true);
        }
      });

      // === Modules ===

      __({
        ImportDeclaration: function() {

          var start = this.nodeStart(),
            imports = null,
            from;

          this.read("import");

          switch (this.peek()) {

            case "*":
              imports = this.NamespaceImport();
              break;

            case "{":
              imports = this.NamedImports();
              break;

            case "STRING":
              from = this.StringLiteral();
              break;

            default:
              imports = this.DefaultImport();
              break;
          }

          if (!from) {

            this.readKeyword("from");
            from = this.StringLiteral();
          }

          this.Semicolon();

          return new AST.ImportDeclaration(imports, from, start, this.nodeEnd());
        }
      });

      __({
        DefaultImport: function() {

          var start = this.nodeStart(),
            ident = this.BindingIdentifier(),
            extra = null;

          if (this.peek() === ",") {

            this.read();

            switch (this.peek()) {

              case "*":
                extra = this.NamespaceImport();
                break;

              case "{":
                extra = this.NamedImports();
                break;

              default:
                this.fail();
            }
          }

          return new AST.DefaultImport(ident, extra, start, this.nodeEnd());
        }
      });

      __({
        NamespaceImport: function() {

          var start = this.nodeStart(),
            ident;

          this.read("*");
          this.readKeyword("as");
          ident = this.BindingIdentifier();

          return new AST.NamespaceImport(ident, start, this.nodeEnd());
        }
      });

      __({
        NamedImports: function() {

          var start = this.nodeStart(),
            list = [];

          this.read("{");

          while (this.peekUntil("}")) {

            list.push(this.ImportSpecifier());

            if (this.peek() === ",") this.read();
          }

          this.read("}");

          return new AST.NamedImports(list, start, this.nodeEnd());
        }
      });

      __({
        ImportSpecifier: function() {

          var start = this.nodeStart(),
            hasLocal = false,
            local = null,
            remote;

          if (this.peek() !== "IDENTIFIER") {

            // Re-scan token as an identifier name
            this.unpeek();
            remote = this.IdentifierName();
            hasLocal = true;

          } else {

            remote = this.Identifier();
            hasLocal = this.peekKeyword("as");
          }

          if (hasLocal) {

            this.readKeyword("as");
            local = this.BindingIdentifier();

          } else {

            this.checkBindingTarget(remote);
          }

          return new AST.ImportSpecifier(remote, local, start, this.nodeEnd());
        }
      });

      __({
        ExportDeclaration: function() {

          var start = this.nodeStart(),
            exports;

          this.read("export");

          switch (this.peek()) {

            case "var":
            case "const":
              exports = this.LexicalDeclaration();
              break;

            case "function":
              exports = this.FunctionDeclaration();
              break;

            case "class":
              exports = this.ClassDeclaration();
              break;

            case "default":
              exports = this.DefaultExport();
              break;

            case "IDENTIFIER":

              if (this.peekLet()) {

                exports = this.LexicalDeclaration();
                break;
              }

              if (this.peekFunctionModifier()) {

                exports = this.FunctionDeclaration();
                break;
              }

            default:
              exports = this.ExportClause();
              this.Semicolon();
              break;
          }

          return new AST.ExportDeclaration(exports, start, this.nodeEnd());
        }
      });

      __({
        DefaultExport: function() {

          var start = this.nodeStart(),
            binding;

          this.read("default");

          switch (this.peek()) {

            case "class":
              binding = this.ClassExpression();
              break;

            case "function":
              binding = this.FunctionExpression();
              break;

            case "IDENTIFIER":

              if (this.peekFunctionModifier()) {

                binding = this.FunctionExpression();
                break;
              }

            default:
              binding = this.AssignmentExpression();
              break;
          }

          var isDecl = this.transformDefaultExport(binding);

          if (!isDecl) this.Semicolon();

          return new AST.DefaultExport(binding, start, this.nodeEnd());
        }
      });

      __({
        ExportClause: function() {
          var __this = this;

          var start = this.nodeStart(),
            list = null,
            from = null;

          if (this.peek() === "*") {

            this.read();
            this.readKeyword("from");
            from = this.StringLiteral();

          } else {

            list = [];

            this.read("{");

            while (this.peekUntil("}", "name")) {

              list.push(this.ExportSpecifier());

              if (this.peek() === ",") this.read();
            }

            this.read("}");

            if (this.peekKeyword("from")) {

              this.read();
              from = this.StringLiteral();

            } else {

              // Transform identifier names to identifiers
              list.forEach(function(node) {
                return __this.transformIdentifier(node.local);
              });
            }
          }

          return new AST.ExportClause(list, from, start, this.nodeEnd());
        }
      });

      __({
        ExportSpecifier: function() {

          var start = this.nodeStart(),
            local = this.IdentifierName(),
            remote = null;

          if (this.peekKeyword("as")) {

            this.read();
            remote = this.IdentifierName();
          }

          return new AST.ExportSpecifier(local, remote, start, this.nodeEnd());
        }
      });;
      __({
        constructor: function Parser() {}
      });

    });

    function mixin(target) {
      var __$0, __$1;
      for (var sources = [], __$2 = 1; __$2 < arguments.length; ++__$2) sources.push(arguments[__$2]);

      target = target.prototype;

      var ownNames = (__$0 = _esdown.objd(Object), __$0.getOwnPropertyNames),
        ownSymbols = __$0.getOwnPropertySymbols,
        ownDesc = __$0.getOwnPropertyDescriptor,
        hasOwn = (__$1 = _esdown.objd(__$0.prototype), __$1.hasOwnProperty)



        ;

      sources.map(function(source) {
        return source.prototype;
      })
        .forEach(function(source) {
          return ownNames(source)
            .concat(ownSymbols(source))
            .filter(function(key) {
              return !hasOwn.call(target, key);
            })
            .forEach(function(key) {
              return Object.defineProperty(target, key, ownDesc(source, key));
            });
        });
    }

    // Add externally defined methods
    mixin(Parser, Transform, Validate);

    exports.Parser = Parser;


  }).call(this, _M22);

  (function(exports) {

    // TODO:  How we deal with the insanity that is with statements?
    // TODO:  Param scopes have empty free lists, which is strange

    var Scope = _esdown.class(function(__) {

      __({
        constructor: function Scope(type) {

          this.type = type || "block";
          this.names = Object.create(null);
          this.free = [];
          this.strict = false;
          this.parent = null;
          this.children = [];
          this.varNames = [];
        }
      });

      __({
        resolveName: function(name) {

          if (this.names[name]) return this.names[name];

          if (this.parent) return this.parent.resolveName(name);

          return null;
        }
      });
    });

    var ScopeResolver = _esdown.class(function(__) {

      __({
        resolve: function(parseResult) {

          this.parseResult = parseResult;
          this.stack = [];
          this.top = new Scope("var");

          this.visit(parseResult.ast);
          this.flushFree();

          parseResult.scopeTree = this.top;
        }
      });

      __({
        fail: function(msg, node) {

          throw this.parseResult.createSyntaxError(msg, node);
        }
      });

      __({
        pushScope: function(type) {

          var strict = this.top.strict;
          this.stack.push(this.top);
          this.top = new Scope(type);
          this.top.strict = strict;

          return this.top;
        }
      });

      __({
        flushFree: function() {

          var map = this.top.names,
            free = this.top.free,
            next = null,
            freeList = [];

          if (this.stack.length > 0) next = this.stack[this.stack.length - 1];

          this.top.free = freeList;

          free.forEach(function(r) {

            var name = r.value;

            if (map[name]) {

              map[name].references.push(r);

            } else {

              freeList.push(r);

              if (next) next.free.push(r);
            }
          });
        }
      });

      __({
        linkScope: function(child) {

          var p = this.top;
          child.parent = p;
          p.children.push(child);
        }
      });

      __({
        popScope: function() {
          var __this = this;

          var scope = this.top,
            varNames = scope.varNames,
            free = scope.free;

          scope.varNames = null;

          this.flushFree();
          this.top = this.stack.pop();
          this.linkScope(scope);

          varNames.forEach(function(n) {

            if (scope.names[n.value]) __this.fail("Cannot shadow lexical declaration with var", n);
            else if (__this.top.type === "var") __this.addName(n, "var");
            else __this.top.varNames.push(n);
          });
        }
      });

      __({
        visit: function(node, kind) {
          var __this = this;

          if (!node) return;

          var f = this[node.type];

          if (typeof f === "function") f.call(this, node, kind);
          else node.children().forEach(function(n) {
            return __this.visit(n, kind);
          });
        }
      });

      __({
        hasStrictDirective: function(statements) {

          for (var i$0 = 0; i$0 < statements.length; ++i$0) {

            var n$0 = statements[i$0];

            if (n$0.type !== "Directive") break;

            if (n$0.value === "use strict") return true;
          }

          return false;
        }
      });

      __({
        visitFunction: function(params, body, strictParams) {
          var __this = this;

          var paramScope = this.pushScope("param");

          if (!this.top.strict && body.statements && this.hasStrictDirective(body.statements)) {

            this.top.strict = true;
          }

          strictParams = strictParams || this.top.strict;

          params.forEach(function(n) {

            if (!strictParams && (
              n.type !== "FormalParameter" || n.initializer || n.pattern.type !== "Identifier")) {

              strictParams = true;
            }

            __this.visit(n, "param");
            __this.flushFree();
            __this.top.free.length = 0;
          });

          this.pushScope("var");
          var blockScope = this.pushScope("block");
          this.visit(body, "var");
          this.popScope();
          this.popScope();

          this.popScope();

          Object.keys(paramScope.names).forEach(function(name) {

            if (blockScope.names[name]) __this.fail("Duplicate block declaration", blockScope.names[name].declarations[0]);

            if (strictParams && paramScope.names[name].declarations.length > 1) __this.fail("Duplicate parameter names", paramScope.names[name].declarations[1]);
          });
        }
      });

      __({
        addReference: function(node) {

          var name = node.value,
            map = this.top.names,
            next = this.stack[this.stack.length - 1];

          if (map[name]) map[name].references.push(node);
          else top.free.push(node);
        }
      });

      __({
        addName: function(node, kind) {

          var name = node.value,
            map = this.top.names,
            record = map[name];

          if (record) {

            if (kind !== "var" && kind !== "param") this.fail("Duplicate variable declaration", node);

          } else {

            if (name === "let" && (kind === "let" || kind === "const")) this.fail("Invalid binding identifier", node);

            map[name] = record = {
              declarations: [],
              references: []
            };
          }

          record.declarations.push(node);
        }
      });

      __({
        Script: function(node) {
          var __this = this;

          this.pushScope("block");

          if (this.hasStrictDirective(node.statements)) this.top.strict = true;

          node.children().forEach(function(n) {
            return __this.visit(n, "var");
          });

          this.popScope();
        }
      });

      __({
        Module: function(node) {
          var __this = this;

          this.pushScope("block");
          this.top.strict = true;
          node.children().forEach(function(n) {
            return __this.visit(n, "var");
          });
          this.popScope();
        }
      });

      __({
        Block: function(node) {
          var __this = this;

          this.pushScope("block");
          node.children().forEach(function(n) {
            return __this.visit(n);
          });
          this.popScope();
        }
      });

      __({
        SwitchStatement: function(node) {

          this.Block(node);
        }
      });

      __({
        ForOfStatement: function(node) {

          this.ForStatement(node);
        }
      });

      __({
        ForInStatement: function(node) {

          this.ForStatement(node);
        }
      });

      __({
        ForStatement: function(node) {
          var __this = this;

          this.pushScope("for");
          node.children().forEach(function(n) {
            return __this.visit(n);
          });
          this.popScope();
        }
      });

      __({
        CatchClause: function(node) {
          var __this = this;

          this.pushScope("catch");
          this.visit(node.param);
          node.body.children().forEach(function(n) {
            return __this.visit(n);
          });
          this.popScope();
        }
      });

      __({
        VariableDeclaration: function(node) {
          var __this = this;

          node.children().forEach(function(n) {
            return __this.visit(n, node.kind);
          });
        }
      });

      __({
        FunctionDeclaration: function(node, kind) {

          this.visit(node.identifier, kind);
          this.pushScope("function");
          this.visitFunction(node.params, node.body, false);
          this.popScope();
        }
      });

      __({
        FunctionExpression: function(node) {

          this.pushScope("function");
          this.visit(node.identifier);
          this.visitFunction(node.params, node.body, false);
          this.popScope();
        }
      });

      __({
        MethodDefinition: function(node) {

          this.pushScope("function");
          this.visitFunction(node.params, node.body, true);
          this.popScope();
        }
      });

      __({
        ArrowFunction: function(node) {

          this.pushScope("function");
          this.visitFunction(node.params, node.body, true);
          this.popScope();
        }
      });

      __({
        ClassDeclaration: function(node) {

          this.visit(node.identifier, "let");
          this.pushScope("class");
          this.top.strict = true;
          this.visit(node.base);
          this.visit(node.body);
          this.popScope();
        }
      });

      __({
        ClassExpression: function(node) {

          this.pushScope("class");
          this.top.strict = true;
          this.visit(node.identifier);
          this.visit(node.base);
          this.visit(node.body);
          this.popScope();
        }
      });

      __({
        Identifier: function(node, kind) {

          switch (node.context) {

            case "variable":
              this.top.free.push(node);
              break;

            case "declaration":
              if (kind === "var" && this.top.type !== "var") this.top.varNames.push(node);
              else this.addName(node, kind);
              break;
          }
        }
      });;
      __({
        constructor: function ScopeResolver() {}
      });

    });

    exports.ScopeResolver = ScopeResolver;


  }).call(this, _M23);

  (function(exports) {

    var Parser = _M22.Parser;
    var ScopeResolver = _M23.ScopeResolver;
    var AST = _M24;

    function addParentLinks(node) {

      node.children().forEach(function(child) {

        child.parent = node;
        addParentLinks(child);
      });
    }

    function parse(input, options) {

      options = options || {};

      var result = new Parser().parse(input, options);

      if (options.resolveScopes) new ScopeResolver().resolve(result);

      if (options.addParentLinks) addParentLinks(result.ast);

      return result;
    }







    exports.AST = AST;
    exports.parse = parse;


  }).call(this, _M18);

  (function(exports) {

    Object.keys(_M18).forEach(function(k) {
      exports[k] = _M18[k];
    });


  }).call(this, _M9);

  (function(exports) {

    var Runtime = {};

    Runtime.API =

      "const VERSION = \"0.9.6\";\n\
\n\
function globalObject() {\n\
\n\
    try { return global.global } catch (x) {}\n\
    try { return window.window } catch (x) {}\n\
    return null;\n\
}\n\
\n\
let arraySlice = Array.prototype.slice,\n\
    hasOwn = Object.prototype.hasOwnProperty,\n\
    staticName = /^__static_/,\n\
    Global = globalObject();\n\
\n\
function toObject(val) {\n\
\n\
    if (val == null)\n\
        throw new TypeError(val + \" is not an object\");\n\
\n\
    return Object(val);\n\
}\n\
\n\
// Returns true if the object has the specified property in\n\
// its prototype chain\n\
function has(obj, name) {\n\
\n\
    for (; obj; obj = Object.getPrototypeOf(obj))\n\
        if (hasOwn.call(obj, name))\n\
            return true;\n\
\n\
    return false;\n\
}\n\
\n\
// Iterates over the descriptors for each own property of an object\n\
function forEachDesc(obj, fn) {\n\
\n\
    let names = Object.getOwnPropertyNames(obj);\n\
\n\
    for (let i = 0; i < names.length; ++i)\n\
        fn(names[i], Object.getOwnPropertyDescriptor(obj, names[i]));\n\
\n\
    names = Object.getOwnPropertySymbols(obj);\n\
\n\
    for (let i = 0; i < names.length; ++i)\n\
        fn(names[i], Object.getOwnPropertyDescriptor(obj, names[i]));\n\
\n\
    return obj;\n\
}\n\
\n\
// Performs copy-based inheritance\n\
function inherit(to, from) {\n\
\n\
    for (; from; from = Object.getPrototypeOf(from)) {\n\
\n\
        forEachDesc(from, (name, desc) => {\n\
\n\
            if (!has(to, name))\n\
                Object.defineProperty(to, name, desc);\n\
        });\n\
    }\n\
\n\
    return to;\n\
}\n\
\n\
// Installs methods into an object, merging \"get\" and \"set\" functions\n\
function mergeMethods(from, to) {\n\
\n\
    forEachDesc(from, (name, desc) => {\n\
\n\
        if (desc.get || desc.set) {\n\
\n\
            let prev = Object.getOwnPropertyDescriptor(to, name);\n\
\n\
            if (prev) {\n\
\n\
                desc.get = desc.get || prev.get;\n\
                desc.set = desc.set || prev.set;\n\
            }\n\
        }\n\
\n\
        desc.enumerable = false;\n\
        Object.defineProperty(to, name, desc);\n\
    });\n\
}\n\
\n\
// Builds a class\n\
function buildClass(base, def) {\n\
\n\
    let parent;\n\
\n\
    if (def === void 0) {\n\
\n\
        // If no base class is specified, then Object.prototype\n\
        // is the parent prototype\n\
        def = base;\n\
        base = null;\n\
        parent = Object.prototype;\n\
\n\
    } else if (base === null) {\n\
\n\
        // If the base is null, then then then the parent prototype is null\n\
        parent = null;\n\
\n\
    } else if (typeof base === \"function\") {\n\
\n\
        parent = base.prototype;\n\
\n\
        // Prototype must be null or an object\n\
        if (parent !== null && Object(parent) !== parent)\n\
            parent = void 0;\n\
    }\n\
\n\
    if (parent === void 0)\n\
        throw new TypeError;\n\
\n\
    // Create the prototype object\n\
    let proto = Object.create(parent),\n\
        statics = {},\n\
        addMethods = obj => mergeMethods(obj, proto),\n\
        addStatics = obj => mergeMethods(obj, statics);\n\
\n\
    Object.assign(addMethods, {\n\
        static: addStatics,\n\
        super: parent,\n\
        csuper: base || Function.prototype\n\
    });\n\
\n\
    // Generate method collections, closing over super bindings\n\
    def(addMethods);\n\
\n\
    if (!hasOwn.call(proto, \"constructor\"))\n\
        throw new Error(\"No constructor specified\");\n\
\n\
    // Make constructor non-enumerable\n\
    Object.defineProperty(proto, \"constructor\", {\n\
        enumerable: false,\n\
        writable: true,\n\
        configurable: true\n\
    });\n\
\n\
    let ctor = proto.constructor;\n\
\n\
    // Set constructor's prototype\n\
    ctor.prototype = proto;\n\
\n\
    // Set class \"static\" methods\n\
    forEachDesc(statics, (name, desc) => Object.defineProperty(ctor, name, desc));\n\
\n\
    // \"Inherit\" from base constructor\n\
    if (base) inherit(ctor, base);\n\
\n\
    return ctor;\n\
}\n\
\n\
Global._esdown = {\n\
\n\
    version: VERSION,\n\
\n\
    global: Global,\n\
\n\
    class: buildClass,\n\
\n\
    // Support for iterator protocol\n\
    iter(obj) {\n\
\n\
        if (obj[Symbol.iterator] !== void 0)\n\
            return obj[Symbol.iterator]();\n\
\n\
        if (Array.isArray(obj))\n\
            return obj.values();\n\
\n\
        return obj;\n\
    },\n\
\n\
    asyncIter(obj) {\n\
\n\
        if (obj[Symbol.asyncIterator] !== void 0)\n\
            return obj[Symbol.asyncIterator]();\n\
\n\
        let iter = { [Symbol.asyncIterator]() { return this } },\n\
            inner = _esdown.iter(obj);\n\
\n\
        [\"next\", \"throw\", \"return\"].forEach(name => {\n\
\n\
            if (name in inner)\n\
                iter[name] = value => Promise.resolve(inner[name](value));\n\
        });\n\
\n\
        return iter;\n\
    },\n\
\n\
    // Support for computed property names\n\
    computed(obj) {\n\
\n\
        let name, desc;\n\
\n\
        for (let i = 1; i < arguments.length; ++i) {\n\
\n\
            name = \"__$\" + (i - 1);\n\
            desc = Object.getOwnPropertyDescriptor(obj, name);\n\
\n\
            if (!desc)\n\
                continue;\n\
\n\
            Object.defineProperty(obj, arguments[i], desc);\n\
            delete obj[name];\n\
        }\n\
\n\
        return obj;\n\
    },\n\
\n\
    // Support for tagged templates\n\
    callSite(values, raw) {\n\
\n\
        values.raw = raw || values;\n\
        return values;\n\
    },\n\
\n\
    // Support for async functions\n\
    async(iter) {\n\
\n\
        return new Promise((resolve, reject) => {\n\
\n\
            resume(\"next\", void 0);\n\
\n\
            function resume(type, value) {\n\
\n\
                try {\n\
\n\
                    let result = iter[type](value);\n\
\n\
                    if (result.done) {\n\
\n\
                        resolve(result.value);\n\
\n\
                    } else {\n\
\n\
                        Promise.resolve(result.value).then(\n\
                            x => resume(\"next\", x),\n\
                            x => resume(\"throw\", x));\n\
                    }\n\
\n\
                } catch (x) { reject(x) }\n\
            }\n\
        });\n\
    },\n\
\n\
    // Support for async generators\n\
    asyncGen(iter) {\n\
\n\
        let front = null, back = null;\n\
\n\
        return {\n\
\n\
            next(val) { return send(\"next\", val) },\n\
            throw(val) { return send(\"throw\", val) },\n\
            return(val) { return send(\"return\", val) },\n\
            [Symbol.asyncIterator]() { return this },\n\
        };\n\
\n\
        function send(type, value) {\n\
\n\
            return new Promise((resolve, reject) => {\n\
\n\
                let x = { type, value, resolve, reject, next: null };\n\
\n\
                if (back) {\n\
\n\
                    back = back.next = x;\n\
\n\
                } else {\n\
\n\
                    front = back = x;\n\
                    resume(type, value);\n\
                }\n\
            });\n\
        }\n\
\n\
        function resume(type, value) {\n\
\n\
            if (type === \"return\" && !(type in iter)) {\n\
\n\
                // HACK: If the generator does not support the \"return\" method, then\n\
                // emulate it (poorly) using throw.  (V8 circa 2015-02-13 does not support\n\
                // generator.return.)\n\
                type = \"throw\";\n\
                value = { value, __return: true };\n\
            }\n\
\n\
            try {\n\
\n\
                let result = iter[type](value);\n\
\n\
                value = result.value;\n\
\n\
                if (typeof value === \"object\" && \"_esdown_await\" in value) {\n\
\n\
                    if (result.done)\n\
                        throw new Error(\"Invalid async generator return\");\n\
\n\
                    Promise.resolve(value._esdown_await).then(\n\
                        x => resume(\"next\", x),\n\
                        x => resume(\"throw\", x));\n\
\n\
                    return;\n\
                }\n\
\n\
                front.resolve(result);\n\
\n\
            } catch (x) {\n\
\n\
                if (x && x.__return === true) {\n\
\n\
                    // HACK: Return-as-throw\n\
                    front.resolve({ value: x.value, done: true });\n\
\n\
                } else {\n\
\n\
                    front.reject(x);\n\
                }\n\
            }\n\
\n\
            front = front.next;\n\
\n\
            if (front) resume(front.type, front.value);\n\
            else back = null;\n\
        }\n\
    },\n\
\n\
    // Support for spread operations\n\
    spread() {\n\
\n\
        return {\n\
\n\
            a: [],\n\
\n\
            // Add items\n\
            s() {\n\
\n\
                for (let i = 0; i < arguments.length; ++i)\n\
                    this.a.push(arguments[i]);\n\
\n\
                return this;\n\
            },\n\
\n\
            // Add the contents of iterables\n\
            i(list) {\n\
\n\
                if (Array.isArray(list)) {\n\
\n\
                    this.a.push.apply(this.a, list);\n\
\n\
                } else {\n\
\n\
                    for (let item of list)\n\
                        this.a.push(item);\n\
                }\n\
\n\
                return this;\n\
            }\n\
\n\
        };\n\
    },\n\
\n\
    // Support for object destructuring\n\
    objd(obj) {\n\
\n\
        return toObject(obj);\n\
    },\n\
\n\
    // Support for array destructuring\n\
    arrayd(obj) {\n\
\n\
        if (Array.isArray(obj)) {\n\
\n\
            return {\n\
\n\
                at(skip, pos) { return obj[pos] },\n\
                rest(skip, pos) { return obj.slice(pos) }\n\
            };\n\
        }\n\
\n\
        let iter = _esdown.iter(toObject(obj));\n\
\n\
        return {\n\
\n\
            at(skip) {\n\
\n\
                let r;\n\
\n\
                while (skip--)\n\
                    r = iter.next();\n\
\n\
                return r.value;\n\
            },\n\
\n\
            rest(skip) {\n\
\n\
                let a = [], r;\n\
\n\
                while (--skip)\n\
                    r = iter.next();\n\
\n\
                while (r = iter.next(), !r.done)\n\
                    a.push(r.value);\n\
\n\
                return a;\n\
            }\n\
        };\n\
    },\n\
\n\
    // Support for private fields\n\
    getPrivate(obj, key) {\n\
\n\
        if (!key.has(Object(obj)))\n\
            throw new TypeError;\n\
\n\
        return key.get(obj);\n\
    },\n\
\n\
    setPrivate(obj, key, value) {\n\
\n\
        if (!key.has(Object(obj)))\n\
            throw new TypeError;\n\
\n\
        return key.set(obj, value);\n\
    }\n\
\n\
};\n\
";

    Runtime.Polyfill =

      "// === Polyfill Utilities ===\n\
\n\
function eachKey(obj, fn) {\n\
\n\
    let keys = Object.getOwnPropertyNames(obj);\n\
\n\
    for (let i = 0; i < keys.length; ++i)\n\
        fn(keys[i]);\n\
\n\
    if (!Object.getOwnPropertySymbols)\n\
        return;\n\
\n\
    keys = Object.getOwnPropertySymbols(obj);\n\
\n\
    for (let i = 0; i < keys.length; ++i)\n\
        fn(keys[i]);\n\
}\n\
\n\
function polyfill(obj, methods) {\n\
\n\
    eachKey(methods, key => {\n\
\n\
        if (key in obj)\n\
            return;\n\
\n\
        Object.defineProperty(obj, key, {\n\
\n\
            value: methods[key],\n\
            configurable: true,\n\
            enumerable: false,\n\
            writable: true\n\
        });\n\
\n\
    });\n\
}\n\
\n\
\n\
// === Spec Helpers ===\n\
\n\
var sign = Math.sign || function(val) {\n\
\n\
    let n = +val;\n\
\n\
    if (n === 0 || Number.isNaN(n))\n\
        return n;\n\
\n\
    return n < 0 ? -1 : 1;\n\
};\n\
\n\
function toInteger(val) {\n\
\n\
    let n = +val;\n\
\n\
    return n !== n /* n is NaN */ ? 0 :\n\
        (n === 0 || !isFinite(n)) ? n :\n\
        sign(n) * Math.floor(Math.abs(n));\n\
}\n\
\n\
function toLength(val) {\n\
\n\
    let n = toInteger(val);\n\
    return n < 0 ? 0 : Math.min(n, Number.MAX_SAFE_INTEGER);\n\
}\n\
\n\
function sameValue(left, right) {\n\
\n\
    if (left === right)\n\
        return left !== 0 || 1 / left === 1 / right;\n\
\n\
    return left !== left && right !== right;\n\
}\n\
\n\
function isRegExp(val) {\n\
\n\
    return Object.prototype.toString.call(val) == \"[object RegExp]\";\n\
}\n\
\n\
function toObject(val) {\n\
\n\
    if (val == null)\n\
        throw new TypeError(val + \" is not an object\");\n\
\n\
    return Object(val);\n\
}\n\
\n\
function iteratorMethod(obj) {\n\
\n\
    // TODO:  What about typeof === \"string\"?\n\
    if (!obj || typeof obj !== \"object\")\n\
        return null;\n\
\n\
    let m = obj[Symbol.iterator];\n\
\n\
    // Generator iterators in Node 0.11.13 do not have a [Symbol.iterator] method\n\
    if (!m && typeof obj.next === \"function\" && typeof obj.throw === \"function\")\n\
        return function() { return this };\n\
\n\
    return m;\n\
}\n\
\n\
function assertThis(val, name) {\n\
\n\
    if (val == null)\n\
        throw new TypeError(name + \" called on null or undefined\");\n\
}\n\
\n\
// === Symbols ===\n\
\n\
let symbolCounter = 0,\n\
    global = _esdown.global;\n\
\n\
function fakeSymbol() {\n\
\n\
    return \"__$\" + Math.floor(Math.random() * 1e9) + \"$\" + (++symbolCounter) + \"$__\";\n\
}\n\
\n\
if (!global.Symbol)\n\
    global.Symbol = fakeSymbol;\n\
\n\
polyfill(Symbol, {\n\
\n\
    iterator: Symbol(\"iterator\"),\n\
\n\
    // Experimental async iterator support\n\
    asyncIterator: Symbol(\"asyncIterator\"),\n\
\n\
    // Experimental async observation support\n\
    observe: Symbol(\"observe\")\n\
\n\
});\n\
\n\
// === Object ===\n\
\n\
polyfill(Object, {\n\
\n\
    is: sameValue,\n\
\n\
    assign(target, source) {\n\
\n\
        target = toObject(target);\n\
\n\
        for (let i = 1; i < arguments.length; ++i) {\n\
\n\
            source = arguments[i];\n\
\n\
            if (source != null) // null or undefined\n\
                Object.keys(source).forEach(key => target[key] = source[key]);\n\
        }\n\
\n\
        return target;\n\
    },\n\
\n\
    setPrototypeOf(object, proto) {\n\
\n\
        // Least effort attempt\n\
        object.__proto__ = proto;\n\
    },\n\
\n\
    getOwnPropertySymbols() {\n\
\n\
        // If getOwnPropertySymbols is not supported, then just return an\n\
        // empty array so that we can avoid feature testing\n\
    }\n\
\n\
});\n\
\n\
// === Number ===\n\
\n\
function isInteger(val) {\n\
\n\
    return typeof val === \"number\" && isFinite(val) && toInteger(val) === val;\n\
}\n\
\n\
function epsilon() {\n\
\n\
    // Calculate the difference between 1 and the smallest value greater than 1 that\n\
    // is representable as a Number value\n\
\n\
    let result;\n\
\n\
    for (let next = 1; 1 + next !== 1; next = next / 2)\n\
        result = next;\n\
\n\
    return result;\n\
}\n\
\n\
polyfill(Number, {\n\
\n\
    EPSILON: epsilon(),\n\
    MAX_SAFE_INTEGER: 9007199254740991,\n\
    MIN_SAFE_INTEGER: -9007199254740991,\n\
\n\
    parseInt: parseInt,\n\
    parseFloat: parseFloat,\n\
    isInteger: isInteger,\n\
    isFinite(val) { return typeof val === \"number\" && isFinite(val) },\n\
    isNaN(val) { return val !== val },\n\
    isSafeInteger(val) { return isInteger(val) && Math.abs(val) <= Number.MAX_SAFE_INTEGER }\n\
\n\
});\n\
\n\
// === String ===\n\
\n\
polyfill(String, {\n\
\n\
    raw(callsite, ...args) {\n\
\n\
        let raw = callsite.raw,\n\
            len = toLength(raw.length);\n\
\n\
        if (len === 0)\n\
            return \"\";\n\
\n\
        let s = \"\", i = 0;\n\
\n\
        while (true) {\n\
\n\
            s += raw[i];\n\
            if (i + 1 === len || i >= args.length) break;\n\
            s += args[i++];\n\
        }\n\
\n\
        return s;\n\
    },\n\
\n\
    fromCodePoint(...points) {\n\
\n\
        let out = [];\n\
\n\
        points.forEach(next => {\n\
\n\
            next = Number(next);\n\
\n\
            if (!sameValue(next, toInteger(next)) || next < 0 || next > 0x10ffff)\n\
                throw new RangeError(\"Invalid code point \" + next);\n\
\n\
            if (next < 0x10000) {\n\
\n\
                out.push(String.fromCharCode(next));\n\
\n\
            } else {\n\
\n\
                next -= 0x10000;\n\
                out.push(String.fromCharCode((next >> 10) + 0xD800));\n\
                out.push(String.fromCharCode((next % 0x400) + 0xDC00));\n\
            }\n\
        });\n\
\n\
        return out.join(\"\");\n\
    }\n\
\n\
});\n\
\n\
// Repeat a string by \"squaring\"\n\
function repeat(s, n) {\n\
\n\
    if (n < 1) return \"\";\n\
    if (n % 2) return repeat(s, n - 1) + s;\n\
    let half = repeat(s, n / 2);\n\
    return half + half;\n\
}\n\
\n\
class StringIterator {\n\
\n\
    constructor(string) {\n\
\n\
        this.string = string;\n\
        this.current = 0;\n\
    }\n\
\n\
    next() {\n\
\n\
        let s = this.string,\n\
            i = this.current,\n\
            len = s.length;\n\
\n\
        if (i >= len) {\n\
\n\
            this.current = Infinity;\n\
            return { value: void 0, done: true };\n\
        }\n\
\n\
        let c = s.charCodeAt(i),\n\
            chars = 1;\n\
\n\
        if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {\n\
\n\
            c = s.charCodeAt(i + 1);\n\
            chars = (c < 0xDC00 || c > 0xDFFF) ? 1 : 2;\n\
        }\n\
\n\
        this.current += chars;\n\
\n\
        return { value: s.slice(i, this.current), done: false };\n\
    }\n\
\n\
    [Symbol.iterator]() { return this }\n\
\n\
}\n\
\n\
polyfill(String.prototype, {\n\
\n\
    repeat(count) {\n\
\n\
        assertThis(this, \"String.prototype.repeat\");\n\
\n\
        let string = String(this);\n\
\n\
        count = toInteger(count);\n\
\n\
        if (count < 0 || count === Infinity)\n\
            throw new RangeError(\"Invalid count value\");\n\
\n\
        return repeat(string, count);\n\
    },\n\
\n\
    startsWith(search) {\n\
\n\
        assertThis(this, \"String.prototype.startsWith\");\n\
\n\
        if (isRegExp(search))\n\
            throw new TypeError(\"First argument to String.prototype.startsWith must not be a regular expression\");\n\
\n\
        let string = String(this);\n\
\n\
        search = String(search);\n\
\n\
        let pos = arguments.length > 1 ? arguments[1] : undefined,\n\
            start = Math.max(toInteger(pos), 0);\n\
\n\
        return string.slice(start, start + search.length) === search;\n\
    },\n\
\n\
    endsWith(search) {\n\
\n\
        assertThis(this, \"String.prototype.endsWith\");\n\
\n\
        if (isRegExp(search))\n\
            throw new TypeError(\"First argument to String.prototype.endsWith must not be a regular expression\");\n\
\n\
        let string = String(this);\n\
\n\
        search = String(search);\n\
\n\
        let len = string.length,\n\
            arg = arguments.length > 1 ? arguments[1] : undefined,\n\
            pos = arg === undefined ? len : toInteger(arg),\n\
            end = Math.min(Math.max(pos, 0), len);\n\
\n\
        return string.slice(end - search.length, end) === search;\n\
    },\n\
\n\
    contains(search) {\n\
\n\
        assertThis(this, \"String.prototype.contains\");\n\
\n\
        let string = String(this),\n\
            pos = arguments.length > 1 ? arguments[1] : undefined;\n\
\n\
        // Somehow this trick makes method 100% compat with the spec\n\
        return string.indexOf(search, pos) !== -1;\n\
    },\n\
\n\
    codePointAt(pos) {\n\
\n\
        assertThis(this, \"String.prototype.codePointAt\");\n\
\n\
        let string = String(this),\n\
            len = string.length;\n\
\n\
        pos = toInteger(pos);\n\
\n\
        if (pos < 0 || pos >= len)\n\
            return undefined;\n\
\n\
        let a = string.charCodeAt(pos);\n\
\n\
        if (a < 0xD800 || a > 0xDBFF || pos + 1 === len)\n\
            return a;\n\
\n\
        let b = string.charCodeAt(pos + 1);\n\
\n\
        if (b < 0xDC00 || b > 0xDFFF)\n\
            return a;\n\
\n\
        return ((a - 0xD800) * 1024) + (b - 0xDC00) + 0x10000;\n\
    },\n\
\n\
    [Symbol.iterator]() {\n\
\n\
        assertThis(this, \"String.prototype[Symbol.iterator]\");\n\
        return new StringIterator(this);\n\
    }\n\
\n\
});\n\
\n\
// === Array ===\n\
\n\
class ArrayIterator {\n\
\n\
    constructor(array, kind) {\n\
\n\
        this.array = array;\n\
        this.current = 0;\n\
        this.kind = kind;\n\
    }\n\
\n\
    next() {\n\
\n\
        let length = toLength(this.array.length),\n\
            index = this.current;\n\
\n\
        if (index >= length) {\n\
\n\
            this.current = Infinity;\n\
            return { value: void 0, done: true };\n\
        }\n\
\n\
        this.current += 1;\n\
\n\
        switch (this.kind) {\n\
\n\
            case \"values\":\n\
                return { value: this.array[index], done: false };\n\
\n\
            case \"entries\":\n\
                return { value: [ index, this.array[index] ], done: false };\n\
\n\
            default:\n\
                return { value: index, done: false };\n\
        }\n\
    }\n\
\n\
    [Symbol.iterator]() { return this }\n\
\n\
}\n\
\n\
polyfill(Array, {\n\
\n\
    from(list) {\n\
\n\
        list = toObject(list);\n\
\n\
        let ctor = typeof this === \"function\" ? this : Array, // TODO: Always use \"this\"?\n\
            map = arguments[1],\n\
            thisArg = arguments[2],\n\
            i = 0,\n\
            out;\n\
\n\
        if (map !== void 0 && typeof map !== \"function\")\n\
            throw new TypeError(map + \" is not a function\");\n\
\n\
        var getIter = iteratorMethod(list);\n\
\n\
        if (getIter) {\n\
\n\
            let iter = getIter.call(list),\n\
                result;\n\
\n\
            out = new ctor;\n\
\n\
            while (result = iter.next(), !result.done) {\n\
\n\
                out[i++] = map ? map.call(thisArg, result.value, i) : result.value;\n\
                out.length = i;\n\
            }\n\
\n\
        } else {\n\
\n\
            let len = toLength(list.length);\n\
\n\
            out = new ctor(len);\n\
\n\
            for (; i < len; ++i)\n\
                out[i] = map ? map.call(thisArg, list[i], i) : list[i];\n\
\n\
            out.length = len;\n\
        }\n\
\n\
        return out;\n\
    },\n\
\n\
    of(...items) {\n\
\n\
        let ctor = typeof this === \"function\" ? this : Array; // TODO: Always use \"this\"?\n\
\n\
        if (ctor === Array)\n\
            return items;\n\
\n\
        let len = items.length,\n\
            out = new ctor(len);\n\
\n\
        for (let i = 0; i < len; ++i)\n\
            out[i] = items[i];\n\
\n\
        out.length = len;\n\
\n\
        return out;\n\
    }\n\
\n\
});\n\
\n\
function arrayFind(obj, pred, thisArg, type) {\n\
\n\
    let len = toLength(obj.length),\n\
        val;\n\
\n\
    if (typeof pred !== \"function\")\n\
        throw new TypeError(pred + \" is not a function\");\n\
\n\
    for (let i = 0; i < len; ++i) {\n\
\n\
        val = obj[i];\n\
\n\
        if (pred.call(thisArg, val, i, obj))\n\
            return type === \"value\" ? val : i;\n\
    }\n\
\n\
    return type === \"value\" ? void 0 : -1;\n\
}\n\
\n\
polyfill(Array.prototype, {\n\
\n\
    copyWithin(target, start) {\n\
\n\
        let obj = toObject(this),\n\
            len = toLength(obj.length),\n\
            end = arguments[2];\n\
\n\
        target = toInteger(target);\n\
        start = toInteger(start);\n\
\n\
        let to = target < 0 ? Math.max(len + target, 0) : Math.min(target, len),\n\
            from = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);\n\
\n\
        end = end !== void 0 ? toInteger(end) : len;\n\
        end = end < 0 ? Math.max(len + end, 0) : Math.min(end, len);\n\
\n\
        let count = Math.min(end - from, len - to),\n\
            dir = 1;\n\
\n\
        if (from < to && to < from + count) {\n\
\n\
            dir = -1;\n\
            from += count - 1;\n\
            to += count - 1;\n\
        }\n\
\n\
        for (; count > 0; --count) {\n\
\n\
            if (from in obj) obj[to] = obj[from];\n\
            else delete obj[to];\n\
\n\
            from += dir;\n\
            to += dir;\n\
        }\n\
\n\
        return obj;\n\
    },\n\
\n\
    fill(value) {\n\
\n\
        let obj = toObject(this),\n\
            len = toLength(obj.length),\n\
            start = toInteger(arguments[1]),\n\
            pos = start < 0 ? Math.max(len + start, 0) : Math.min(start, len),\n\
            end = arguments.length > 2 ? toInteger(arguments[2]) : len;\n\
\n\
        end = end < 0 ? Math.max(len + end, 0) : Math.min(end, len);\n\
\n\
        for (; pos < end; ++pos)\n\
            obj[pos] = value;\n\
\n\
        return obj;\n\
    },\n\
\n\
    find(pred) {\n\
\n\
        return arrayFind(toObject(this), pred, arguments[1], \"value\");\n\
    },\n\
\n\
    findIndex(pred) {\n\
\n\
        return arrayFind(toObject(this), pred, arguments[1], \"index\");\n\
    },\n\
\n\
    values()  { return new ArrayIterator(this, \"values\") },\n\
\n\
    entries() { return new ArrayIterator(this, \"entries\") },\n\
\n\
    keys()    { return new ArrayIterator(this, \"keys\") },\n\
\n\
    [Symbol.iterator]() { return this.values() }\n\
\n\
});\n\
";

    Runtime.MapSet =

      "let global = _esdown.global,\n\
    ORIGIN = {},\n\
    REMOVED = {};\n\
\n\
class MapNode {\n\
\n\
    constructor(key, val) {\n\
\n\
        this.key = key;\n\
        this.value = val;\n\
        this.prev = this;\n\
        this.next = this;\n\
    }\n\
\n\
    insert(next) {\n\
\n\
        this.next = next;\n\
        this.prev = next.prev;\n\
        this.prev.next = this;\n\
        this.next.prev = this;\n\
    }\n\
\n\
    remove() {\n\
\n\
        this.prev.next = this.next;\n\
        this.next.prev = this.prev;\n\
        this.key = REMOVED;\n\
    }\n\
\n\
}\n\
\n\
class MapIterator {\n\
\n\
    constructor(node, kind) {\n\
\n\
        this.current = node;\n\
        this.kind = kind;\n\
    }\n\
\n\
    next() {\n\
\n\
        let node = this.current;\n\
\n\
        while (node.key === REMOVED)\n\
            node = this.current = this.current.next;\n\
\n\
        if (node.key === ORIGIN)\n\
            return { value: void 0, done: true };\n\
\n\
        this.current = this.current.next;\n\
\n\
        switch (this.kind) {\n\
\n\
            case \"values\":\n\
                return { value: node.value, done: false };\n\
\n\
            case \"entries\":\n\
                return { value: [ node.key, node.value ], done: false };\n\
\n\
            default:\n\
                return { value: node.key, done: false };\n\
        }\n\
    }\n\
\n\
    [Symbol.iterator]() { return this }\n\
}\n\
\n\
function hashKey(key) {\n\
\n\
    switch (typeof key) {\n\
\n\
        case \"string\": return \"$\" + key;\n\
        case \"number\": return String(key);\n\
    }\n\
\n\
    throw new TypeError(\"Map and Set keys must be strings or numbers in esdown\");\n\
}\n\
\n\
class Map {\n\
\n\
    constructor() {\n\
\n\
        if (arguments.length > 0)\n\
            throw new Error(\"Arguments to Map constructor are not supported in esdown\");\n\
\n\
        this._index = {};\n\
        this._origin = new MapNode(ORIGIN);\n\
    }\n\
\n\
    clear() {\n\
\n\
        for (let node = this._origin.next; node !== this._origin; node = node.next)\n\
            node.key = REMOVED;\n\
\n\
        this._index = {};\n\
        this._origin = new MapNode(ORIGIN);\n\
    }\n\
\n\
    delete(key) {\n\
\n\
        let h = hashKey(key),\n\
            node = this._index[h];\n\
\n\
        if (node) {\n\
\n\
            node.remove();\n\
            delete this._index[h];\n\
            return true;\n\
        }\n\
\n\
        return false;\n\
    }\n\
\n\
    forEach(fn) {\n\
\n\
        let thisArg = arguments[1];\n\
\n\
        if (typeof fn !== \"function\")\n\
            throw new TypeError(fn + \" is not a function\");\n\
\n\
        for (let node = this._origin.next; node.key !== ORIGIN; node = node.next)\n\
            if (node.key !== REMOVED)\n\
                fn.call(thisArg, node.value, node.key, this);\n\
    }\n\
\n\
    get(key) {\n\
\n\
        let h = hashKey(key),\n\
            node = this._index[h];\n\
\n\
        return node ? node.value : void 0;\n\
    }\n\
\n\
    has(key) {\n\
\n\
        return hashKey(key) in this._index;\n\
    }\n\
\n\
    set(key, val) {\n\
\n\
        let h = hashKey(key),\n\
            node = this._index[h];\n\
\n\
        if (node) {\n\
\n\
            node.value = val;\n\
            return;\n\
        }\n\
\n\
        node = new MapNode(key, val);\n\
\n\
        this._index[h] = node;\n\
        node.insert(this._origin);\n\
    }\n\
\n\
    get size() {\n\
\n\
        return Object.keys(this._index).length;\n\
    }\n\
\n\
    keys() { return new MapIterator(this._origin.next, \"keys\") }\n\
    values() { return new MapIterator(this._origin.next, \"values\") }\n\
    entries() { return new MapIterator(this._origin.next, \"entries\") }\n\
\n\
    [Symbol.iterator]() { return new MapIterator(this._origin.next, \"entries\") }\n\
\n\
}\n\
\n\
var mapSet = Map.prototype.set;\n\
\n\
class Set {\n\
\n\
    constructor() {\n\
\n\
        if (arguments.length > 0)\n\
            throw new Error(\"Arguments to Set constructor are not supported in esdown\");\n\
\n\
        this._index = {};\n\
        this._origin = new MapNode(ORIGIN);\n\
    }\n\
\n\
    add(key) { return mapSet.call(this, key, key) }\n\
\n\
    [Symbol.iterator]() { return new MapIterator(this._origin.next, \"entries\") }\n\
\n\
}\n\
\n\
// Copy shared prototype members to Set\n\
[\"clear\", \"delete\", \"forEach\", \"has\", \"size\", \"keys\", \"values\", \"entries\"].forEach(k => {\n\
\n\
    let d = Object.getOwnPropertyDescriptor(Map.prototype, k);\n\
    Object.defineProperty(Set.prototype, k, d);\n\
});\n\
\n\
if (!global.Map || !global.Map.prototype.entries) {\n\
\n\
    global.Map = Map;\n\
    global.Set = Set;\n\
}\n\
";

    Runtime.Promise =

      "(function() { \"use strict\";\n\
\n\
// Find global variable and exit if Promise is defined on it\n\
\n\
var Global = (function() {\n\
    if (typeof window !== \"undefined\" && window && window.window === window)\n\
        return window;\n\
    if (typeof global !== \"undefined\" && global && global.global === global)\n\
        return global;\n\
    throw new Error(\"Unable to determine global object\");\n\
})();\n\
\n\
if (typeof Global.Promise === \"function\")\n\
    return;\n\
\n\
// Create an efficient microtask queueing mechanism\n\
\n\
var runLater = (function() {\n\
    // Node\n\
    if (Global.process && typeof process.version === \"string\") {\n\
        return Global.setImmediate ?\n\
            function(fn) { setImmediate(fn); } :\n\
            function(fn) { process.nextTick(fn); };\n\
    }\n\
\n\
    // Newish Browsers\n\
    var Observer = Global.MutationObserver || Global.WebKitMutationObserver;\n\
\n\
    if (Observer) {\n\
        var div = document.createElement(\"div\"),\n\
            queuedFn = void 0;\n\
\n\
        var observer = new Observer(function() {\n\
            var fn = queuedFn;\n\
            queuedFn = void 0;\n\
            fn();\n\
        });\n\
\n\
        observer.observe(div, { attributes: true });\n\
\n\
        return function(fn) {\n\
            if (queuedFn !== void 0)\n\
                throw new Error(\"Only one function can be queued at a time\");\n\
            queuedFn = fn;\n\
            div.classList.toggle(\"x\");\n\
        };\n\
    }\n\
\n\
    // Fallback\n\
    return function(fn) { setTimeout(fn, 0); };\n\
})();\n\
\n\
var EnqueueMicrotask = (function() {\n\
    var queue = null;\n\
\n\
    function flush() {\n\
        var q = queue;\n\
        queue = null;\n\
        for (var i = 0; i < q.length; ++i)\n\
            q[i]();\n\
    }\n\
\n\
    return function PromiseEnqueueMicrotask(fn) {\n\
        // fn must not throw\n\
        if (!queue) {\n\
            queue = [];\n\
            runLater(flush);\n\
        }\n\
        queue.push(fn);\n\
    };\n\
})();\n\
\n\
// Mock V8 internal functions and vars\n\
\n\
function SET_PRIVATE(obj, prop, val) { obj[prop] = val; }\n\
function GET_PRIVATE(obj, prop) { return obj[prop]; }\n\
function IS_SPEC_FUNCTION(obj) { return typeof obj === \"function\"; }\n\
function IS_SPEC_OBJECT(obj) { return obj === Object(obj); }\n\
function HAS_DEFINED_PRIVATE(obj, prop) { return prop in obj; }\n\
function IS_UNDEFINED(x) { return x === void 0; }\n\
function MakeTypeError(msg) { return new TypeError(msg); }\n\
\n\
// In IE8 Object.defineProperty only works on DOM nodes, and defineProperties does not exist\n\
var _defineProperty = Object.defineProperties && Object.defineProperty;\n\
\n\
function AddNamedProperty(target, name, value) {\n\
    if (!_defineProperty) {\n\
        target[name] = value;\n\
        return;\n\
    }\n\
\n\
    _defineProperty(target, name, {\n\
        configurable: true,\n\
        writable: true,\n\
        enumerable: false,\n\
        value: value\n\
    });\n\
}\n\
\n\
function InstallFunctions(target, attr, list) {\n\
    for (var i = 0; i < list.length; i += 2)\n\
        AddNamedProperty(target, list[i], list[i + 1]);\n\
}\n\
\n\
var IsArray = Array.isArray || (function(obj) {\n\
    var str = Object.prototype.toString;\n\
    return function(obj) { return str.call(obj) === \"[object Array]\" };\n\
})();\n\
\n\
var UNDEFINED, DONT_ENUM, InternalArray = Array;\n\
\n\
// V8 Implementation\n\
\n\
var IsPromise;\n\
var PromiseCreate;\n\
var PromiseResolve;\n\
var PromiseReject;\n\
var PromiseChain;\n\
var PromiseCatch;\n\
var PromiseThen;\n\
\n\
// Status values: 0 = pending, +1 = resolved, -1 = rejected\n\
var promiseStatus = \"Promise#status\";\n\
var promiseValue = \"Promise#value\";\n\
var promiseOnResolve = \"Promise#onResolve\";\n\
var promiseOnReject = \"Promise#onReject\";\n\
var promiseRaw = {};\n\
var promiseHasHandler = \"Promise#hasHandler\";\n\
var lastMicrotaskId = 0;\n\
\n\
var $Promise = function Promise(resolver) {\n\
    if (resolver === promiseRaw) return;\n\
    if (!IS_SPEC_FUNCTION(resolver))\n\
      throw MakeTypeError('resolver_not_a_function', [resolver]);\n\
    var promise = PromiseInit(this);\n\
    try {\n\
        resolver(function(x) { PromiseResolve(promise, x) },\n\
                 function(r) { PromiseReject(promise, r) });\n\
    } catch (e) {\n\
        PromiseReject(promise, e);\n\
    }\n\
}\n\
\n\
// Core functionality.\n\
\n\
function PromiseSet(promise, status, value, onResolve, onReject) {\n\
    SET_PRIVATE(promise, promiseStatus, status);\n\
    SET_PRIVATE(promise, promiseValue, value);\n\
    SET_PRIVATE(promise, promiseOnResolve, onResolve);\n\
    SET_PRIVATE(promise, promiseOnReject, onReject);\n\
    return promise;\n\
}\n\
\n\
function PromiseInit(promise) {\n\
    return PromiseSet(promise, 0, UNDEFINED, new InternalArray, new InternalArray);\n\
}\n\
\n\
function PromiseDone(promise, status, value, promiseQueue) {\n\
    if (GET_PRIVATE(promise, promiseStatus) === 0) {\n\
        PromiseEnqueue(value, GET_PRIVATE(promise, promiseQueue), status);\n\
        PromiseSet(promise, status, value);\n\
    }\n\
}\n\
\n\
function PromiseCoerce(constructor, x) {\n\
    if (!IsPromise(x) && IS_SPEC_OBJECT(x)) {\n\
        var then;\n\
        try {\n\
            then = x.then;\n\
        } catch(r) {\n\
            return PromiseRejected.call(constructor, r);\n\
        }\n\
        if (IS_SPEC_FUNCTION(then)) {\n\
            var deferred = PromiseDeferred.call(constructor);\n\
            try {\n\
                then.call(x, deferred.resolve, deferred.reject);\n\
            } catch(r) {\n\
                deferred.reject(r);\n\
            }\n\
            return deferred.promise;\n\
        }\n\
    }\n\
    return x;\n\
}\n\
\n\
function PromiseHandle(value, handler, deferred) {\n\
    try {\n\
        var result = handler(value);\n\
        if (result === deferred.promise)\n\
            throw MakeTypeError('promise_cyclic', [result]);\n\
        else if (IsPromise(result))\n\
            PromiseChain.call(result, deferred.resolve, deferred.reject);\n\
        else\n\
            deferred.resolve(result);\n\
    } catch (exception) {\n\
        try { deferred.reject(exception) } catch (e) { }\n\
    }\n\
}\n\
\n\
function PromiseEnqueue(value, tasks, status) {\n\
    EnqueueMicrotask(function() {\n\
        for (var i = 0; i < tasks.length; i += 2)\n\
            PromiseHandle(value, tasks[i], tasks[i + 1]);\n\
    });\n\
}\n\
\n\
function PromiseIdResolveHandler(x) { return x }\n\
function PromiseIdRejectHandler(r) { throw r }\n\
\n\
function PromiseNopResolver() {}\n\
\n\
// -------------------------------------------------------------------\n\
// Define exported functions.\n\
\n\
// For bootstrapper.\n\
\n\
IsPromise = function IsPromise(x) {\n\
    return IS_SPEC_OBJECT(x) && HAS_DEFINED_PRIVATE(x, promiseStatus);\n\
};\n\
\n\
PromiseCreate = function PromiseCreate() {\n\
    return new $Promise(PromiseNopResolver);\n\
};\n\
\n\
PromiseResolve = function PromiseResolve(promise, x) {\n\
    PromiseDone(promise, +1, x, promiseOnResolve);\n\
};\n\
\n\
PromiseReject = function PromiseReject(promise, r) {\n\
    PromiseDone(promise, -1, r, promiseOnReject);\n\
};\n\
\n\
// Convenience.\n\
\n\
function PromiseDeferred() {\n\
    if (this === $Promise) {\n\
        // Optimized case, avoid extra closure.\n\
        var promise = PromiseInit(new $Promise(promiseRaw));\n\
        return {\n\
            promise: promise,\n\
            resolve: function(x) { PromiseResolve(promise, x) },\n\
            reject: function(r) { PromiseReject(promise, r) }\n\
        };\n\
    } else {\n\
        var result = {};\n\
        result.promise = new this(function(resolve, reject) {\n\
            result.resolve = resolve;\n\
            result.reject = reject;\n\
        });\n\
        return result;\n\
    }\n\
}\n\
\n\
function PromiseResolved(x) {\n\
    if (this === $Promise) {\n\
        // Optimized case, avoid extra closure.\n\
        return PromiseSet(new $Promise(promiseRaw), +1, x);\n\
    } else {\n\
        return new this(function(resolve, reject) { resolve(x) });\n\
    }\n\
}\n\
\n\
function PromiseRejected(r) {\n\
    var promise;\n\
    if (this === $Promise) {\n\
        // Optimized case, avoid extra closure.\n\
        promise = PromiseSet(new $Promise(promiseRaw), -1, r);\n\
    } else {\n\
        promise = new this(function(resolve, reject) { reject(r) });\n\
    }\n\
    return promise;\n\
}\n\
\n\
// Simple chaining.\n\
\n\
PromiseChain = function PromiseChain(onResolve, onReject) {\n\
    onResolve = IS_UNDEFINED(onResolve) ? PromiseIdResolveHandler : onResolve;\n\
    onReject = IS_UNDEFINED(onReject) ? PromiseIdRejectHandler : onReject;\n\
    var deferred = PromiseDeferred.call(this.constructor);\n\
    switch (GET_PRIVATE(this, promiseStatus)) {\n\
        case UNDEFINED:\n\
            throw MakeTypeError('not_a_promise', [this]);\n\
        case 0:  // Pending\n\
            GET_PRIVATE(this, promiseOnResolve).push(onResolve, deferred);\n\
            GET_PRIVATE(this, promiseOnReject).push(onReject, deferred);\n\
            break;\n\
        case +1:  // Resolved\n\
            PromiseEnqueue(GET_PRIVATE(this, promiseValue), [onResolve, deferred], +1);\n\
            break;\n\
        case -1:  // Rejected\n\
            PromiseEnqueue(GET_PRIVATE(this, promiseValue), [onReject, deferred], -1);\n\
            break;\n\
    }\n\
    // Mark this promise as having handler.\n\
    SET_PRIVATE(this, promiseHasHandler, true);\n\
    return deferred.promise;\n\
}\n\
\n\
PromiseCatch = function PromiseCatch(onReject) {\n\
    return this.then(UNDEFINED, onReject);\n\
}\n\
\n\
// Multi-unwrapped chaining with thenable coercion.\n\
\n\
PromiseThen = function PromiseThen(onResolve, onReject) {\n\
    onResolve = IS_SPEC_FUNCTION(onResolve) ? onResolve : PromiseIdResolveHandler;\n\
    onReject = IS_SPEC_FUNCTION(onReject) ? onReject : PromiseIdRejectHandler;\n\
    var that = this;\n\
    var constructor = this.constructor;\n\
    return PromiseChain.call(\n\
        this,\n\
        function(x) {\n\
            x = PromiseCoerce(constructor, x);\n\
            return x === that ? onReject(MakeTypeError('promise_cyclic', [x])) :\n\
                IsPromise(x) ? x.then(onResolve, onReject) :\n\
                onResolve(x);\n\
        },\n\
        onReject);\n\
}\n\
\n\
// Combinators.\n\
\n\
function PromiseCast(x) {\n\
    return IsPromise(x) ? x : new this(function(resolve) { resolve(x) });\n\
}\n\
\n\
function PromiseAll(values) {\n\
    var deferred = PromiseDeferred.call(this);\n\
    var resolutions = [];\n\
    if (!IsArray(values)) {\n\
        deferred.reject(MakeTypeError('invalid_argument'));\n\
        return deferred.promise;\n\
    }\n\
    try {\n\
        var count = values.length;\n\
        if (count === 0) {\n\
            deferred.resolve(resolutions);\n\
        } else {\n\
            for (var i = 0; i < values.length; ++i) {\n\
                this.resolve(values[i]).then(\n\
                    (function() {\n\
                        // Nested scope to get closure over current i (and avoid .bind).\n\
                        var i_captured = i;\n\
                        return function(x) {\n\
                            resolutions[i_captured] = x;\n\
                            if (--count === 0) deferred.resolve(resolutions);\n\
                        };\n\
                    })(),\n\
                    function(r) { deferred.reject(r) });\n\
            }\n\
        }\n\
    } catch (e) {\n\
        deferred.reject(e);\n\
    }\n\
    return deferred.promise;\n\
}\n\
\n\
function PromiseOne(values) {\n\
    var deferred = PromiseDeferred.call(this);\n\
    if (!IsArray(values)) {\n\
        deferred.reject(MakeTypeError('invalid_argument'));\n\
        return deferred.promise;\n\
    }\n\
    try {\n\
        for (var i = 0; i < values.length; ++i) {\n\
            this.resolve(values[i]).then(\n\
                function(x) { deferred.resolve(x) },\n\
                function(r) { deferred.reject(r) });\n\
        }\n\
    } catch (e) {\n\
        deferred.reject(e);\n\
    }\n\
    return deferred.promise;\n\
}\n\
\n\
// -------------------------------------------------------------------\n\
// Install exported functions.\n\
\n\
AddNamedProperty(Global, 'Promise', $Promise, DONT_ENUM);\n\
\n\
InstallFunctions($Promise, DONT_ENUM, [\n\
    \"defer\", PromiseDeferred,\n\
    \"accept\", PromiseResolved,\n\
    \"reject\", PromiseRejected,\n\
    \"all\", PromiseAll,\n\
    \"race\", PromiseOne,\n\
    \"resolve\", PromiseCast\n\
]);\n\
\n\
InstallFunctions($Promise.prototype, DONT_ENUM, [\n\
    \"chain\", PromiseChain,\n\
    \"then\", PromiseThen,\n\
    \"catch\", PromiseCatch\n\
]);\n\
\n\
})();\n\
";

    Runtime.Observable =

      "class Observable {\n\
\n\
    constructor(start) {\n\
\n\
        // The stream initializer must be a function\n\
        if (typeof start !== \"function\")\n\
            throw new TypeError(\"Observer definition is not a function\");\n\
\n\
        this._start = start;\n\
    }\n\
\n\
    observe(sink) {\n\
\n\
        if (typeof sink === \"function\")\n\
            sink = { next: sink };\n\
\n\
        // The sink must be an object\n\
        if (Object(sink) !== sink)\n\
            throw new TypeError(\"Sink is not an object\");\n\
\n\
        let start = this._start,\n\
            finished = false,\n\
            cleanup;\n\
\n\
        // Wrap the provided sink\n\
        sink = _wrapSink(sink, _=> {\n\
\n\
            finished = true;\n\
\n\
            if (cleanup !== void 0)\n\
                cleanup();\n\
        });\n\
\n\
        try {\n\
\n\
            // Call the stream initializer.  The initializer will return a cleanup\n\
            // function or undefined.\n\
            cleanup = start.call(void 0, sink);\n\
\n\
        } catch (e) {\n\
\n\
            sink.throw(e);\n\
        }\n\
\n\
        // If the stream is already finished, then perform cleanup\n\
        if (finished && cleanup !== void 0)\n\
            cleanup();\n\
\n\
        // Return a cancelation function\n\
        return sink.return;\n\
    }\n\
\n\
    /*\n\
\n\
        Observer sinks are wrapped for the following reasons:\n\
\n\
        - Ensures that the sink is not called after the stream is closed.\n\
        - Ensures that the returned object has all three sink methods (\"next\", \"throw\", and \"return\").\n\
        - Ensures that values are properly handled when the sink does not have \"throw\" or \"return\".\n\
        - Ensures that returned methods can be called without a provided \"this\" value.\n\
        - Ensures that cleanup is triggered when the stream is closed.\n\
\n\
    */\n\
    function _wrapSink(sink, cleanup) {\n\
\n\
        let done = false;\n\
\n\
        // Marks the stream as closed and triggers stream cleanup.  Exceptions\n\
        // which occur during cleanup are propagated to the caller.\n\
        function close() {\n\
\n\
            if (!done) {\n\
\n\
                done = true;\n\
                cleanup();\n\
            }\n\
        }\n\
\n\
        // Returns a \"done\" result\n\
        function doneResult() {\n\
\n\
            return { value: void 0, done: true };\n\
        }\n\
\n\
        // Sends a completion value to the sink\n\
        function send(op, value) {\n\
\n\
            // If the stream if closed, then return a \"done\" result\n\
            if (done)\n\
                return doneResult();\n\
\n\
            let result;\n\
\n\
            try {\n\
\n\
                switch (op) {\n\
\n\
                    case \"next\":\n\
\n\
                        // Send the next value to the sink\n\
                        result = sink.next(value);\n\
                        break;\n\
\n\
                    case \"throw\":\n\
\n\
                        // If the sink does not support \"throw\", then throw value back to caller\n\
                        if (!(\"throw\" in sink))\n\
                            throw value;\n\
\n\
                        result = sink.throw(value);\n\
                        break;\n\
\n\
                    case \"return\":\n\
\n\
                        // If the sink does not support \"return\", then close and return a done result\n\
                        if (!(\"return\" in sink))\n\
                            return close(), doneResult();\n\
\n\
                        result = sink.return(value);\n\
\n\
                        // If the sink does not return a result, then assume that it is finished\n\
                        if (!result)\n\
                            result = doneResult();\n\
\n\
                        break;\n\
\n\
                }\n\
\n\
            } catch (e) {\n\
\n\
                // If the sink throws, then close the stream and throw error to caller\n\
                close();\n\
                throw e;\n\
            }\n\
\n\
            // If the sink is finished receiving data, then close the stream\n\
            if (result && result.done)\n\
                close();\n\
\n\
            return result;\n\
        }\n\
\n\
        return {\n\
            next(value) { return send(\"next\", value) },\n\
            throw(value) { return send(\"throw\", value) },\n\
            return(value) { return send(\"return\", value) },\n\
        };\n\
    }\n\
\n\
    async *[Symbol.asyncIterator]() {\n\
\n\
        let ready = [], pending = [];\n\
\n\
        function send(x) {\n\
\n\
            if (pending.length > 0) pending.shift()(x);\n\
            else ready.push(x);\n\
        }\n\
\n\
        function next() {\n\
\n\
            return ready.length > 0 ?\n\
                ready.shift() :\n\
                new Promise(resolve => pending.push(resolve));\n\
        }\n\
\n\
        let cancel = this.observe({\n\
\n\
            next(value) { send({ type: \"next\", value }) },\n\
            throw(value) { send({ type: \"throw\", value }) },\n\
            return(value) { send({ type: \"return\", value }) },\n\
        });\n\
\n\
        try {\n\
\n\
            while (true) {\n\
\n\
                let result = await next();\n\
\n\
                if (result.type == \"return\") return result.value;\n\
                else if (result.type === \"throw\") throw result.value;\n\
                else yield result.value;\n\
            }\n\
\n\
        } finally {\n\
\n\
            cancel();\n\
        }\n\
    }\n\
\n\
    forEach(fn) {\n\
\n\
        return new Promise((resolve, reject) => {\n\
\n\
            this.observe({\n\
\n\
                next: fn,\n\
                throw: reject,\n\
                return: resolve,\n\
            });\n\
        });\n\
    }\n\
\n\
    map(fn) {\n\
\n\
        if (typeof fn !== \"function\")\n\
            throw new TypeError(\"Callback is not a function\");\n\
\n\
        return new this.constructor(sink => this.observe({\n\
\n\
            next(value) {\n\
\n\
                try { value = fn(value) }\n\
                catch (e) { return sink.throw(e) }\n\
\n\
                return sink.next(value);\n\
            },\n\
\n\
            throw: sink.throw,\n\
            return: sink.return,\n\
\n\
        }));\n\
    }\n\
\n\
}\n\
\n\
\n\
if (!_esdown.global.Observable)\n\
    _esdown.global.Observable = Observable;\n\
";


    exports.Runtime = Runtime;


  }).call(this, _M17);

  (function(exports) {

    var NODE_SCHEME = /^node:/i,
      URI_SCHEME = /^[a-z]+:/i;

    function isLegacyScheme(spec) {

      return NODE_SCHEME.test(spec);
    }

    function removeScheme(uri) {

      return uri.replace(URI_SCHEME, "");
    }

    function hasScheme(uri) {

      return URI_SCHEME.test(uri);
    }

    exports.isLegacyScheme = isLegacyScheme;
    exports.removeScheme = removeScheme;
    exports.hasScheme = hasScheme;


  }).call(this, _M16);

  (function(exports) {

    var parse = _M9.parse,
      AST = _M9.AST;
    var isLegacyScheme = _M16.isLegacyScheme,
      removeScheme = _M16.removeScheme;

    var NODE_SCHEME = /^node:/i,
      URI_SCHEME = /^[a-z]+:/i;

    var RESERVED_WORD = new RegExp("^(?:" + "break|case|catch|class|const|continue|debugger|default|delete|do|" + "else|enum|export|extends|false|finally|for|function|if|import|in|" + "instanceof|new|null|return|super|switch|this|throw|true|try|typeof|" + "var|void|while|with|implements|private|public|interface|package|let|" + "protected|static|yield" + ")$");

    function countNewlines(text) {

      var m = text.match(/\r\n?|\n/g);
      return m ? m.length : 0;
    }

    function preserveNewlines(text, height) {

      var n = countNewlines(text);

      if (height > 0 && n < height) text += "\n".repeat(height - n);

      return text;
    }

    function isAsyncType(type) {

      return type === "async" || type === "async-generator";
    }

    function isGeneratorType(type) {

      return type === "generator" || type === "async-generator";
    }

    var PatternTreeNode = _esdown.class(function(__) {

      __({
        constructor: function PatternTreeNode(name, init, skip) {

          this.name = name;
          this.initializer = init;
          this.children = [];
          this.target = "";
          this.skip = skip | 0;
          this.array = false;
          this.rest = false;
        }
      });
    });

    var RootNode = _esdown.class(function(__) {

      __({
        constructor: function RootNode(root, end) {

          this.type = "Root";
          this.start = 0;
          this.end = end;
          this.root = root;
        }
      });
    });

    RootNode.prototype = AST.Node.prototype;


    function collapseScopes(parseResult) {

      var names = Object.create(null);

      visit(parseResult.scopeTree, null);

      function makeSuffix(name) {

        var count = names[name] | 0;
        names[name] = count + 1;
        return "$" + count;
      }

      function fail(msg, node) {

        throw parseResult.createSyntaxError("[esdown] " + msg, node);
      }

      function visit(scope, forScope) {

        switch (scope.type) {

          case "block":
            rename(scope);
            break;

          case "for":
            rename(scope);
            forScope = scope;
            break;

          case "function":

            if (forScope) {

              var set$0 = Object.create(null);

              forScope.free.forEach(function(r) {
                return set$0[r.value] = 1;
              });

              scope.free.forEach(function(r) {

                if (set$0[r.value] !== 1) fail("Closure capturing per-iteration bindings", r);
              });

              forScope = null;
            }

            break;
        }

        scope.children.forEach(function(c) {
          return visit(c, forScope);
        });
      }

      function rename(node) {

        /*

         TODO:  Throw a compile-time error if a lexical name is referenced in the same
         function (not a nested closure) before the binding is initialized.  This won't
         catch all potential TDZ issues but will help stop some obvious bugs.

         */

        var varParent = node.parent.type === "var";

        Object.keys(node.names).forEach(function(name) {

          var record = node.names[name],
            suffix = "";

          if (!varParent) suffix = makeSuffix(name);

          record.declarations.forEach(function(decl) {
            return decl.suffix = suffix;
          });
          record.references.forEach(function(ref) {
            return ref.suffix = suffix;
          });
        });
      }
    }

    var Replacer = _esdown.class(function(__) {

      __({
        replace: function(input, options) {
          var __this = this;
          if (options === void 0) options = {};

          this.parseResult = parse(input, {

            module: options.module,
            addParentLinks: true,
            resolveScopes: true
          });

          var root = this.parseResult.ast;

          collapseScopes(this.parseResult);

          this.input = input;
          this.exports = {};
          this.imports = {};
          this.dependencies = [];
          this.isStrict = false;
          this.uid = 0;

          var visit = function(node) {

            node.text = null;

            // Call pre-order traversal method
            if (__this[node.type + "Begin"]) __this[node.type + "Begin"](node);

            var strict = __this.isStrict;

            // Set the strictness for implicitly strict nodes
            switch (node.type) {

              case "Module":
              case "ClassDeclaration":
              case "ClassExpresion":
                __this.isStrict = true;
            }

            // Perform a depth-first traversal
            node.children().forEach(visit);

            // Restore strictness
            __this.isStrict = strict;

            var text = null;

            // Call replacer
            if (__this[node.type]) text = __this[node.type](node);

            if (text === null || text === void 0) text = __this.stringify(node);

            return node.text = __this.syncNewlines(node.start, node.end, text);
          };

          var output = visit(new RootNode(root, input.length)),
            head = "";

          this.dependencies.forEach(function(dep) {

            if (head) head += ", ";
            else head = "var ";

            var url = dep.url,
              legacyFlag = dep.legacy ? ", 1" : "";

            head += "" + (__this.imports[url]) + " = __load(" + (JSON.stringify(dep.url)) + "" + (legacyFlag) + ")";
          });

          if (head) head += "; ";

          output = head + output;

          var exports = Object.keys(this.exports);

          if (exports.length > 0) {

            output += "\n";
            output += exports.map(function(k) {
              return "exports." + (k) + " = " + (__this.exports[k]) + ";";
            }).join("\n");
            output += "\n";
          }

          return output;
        }
      });

      __({
        DoWhileStatement: function(node) {

          var text = this.stringify(node);

          if (text.slice(-1) !== ";") return text + ";";
        }
      });

      __({
        ForOfStatement: function(node) {

          var iter = this.addTempVar(node, null, true),
            iterResult = this.addTempVar(node, null, true),
            context = this.parentFunction(node),
            decl = "",
            binding,
            head;

          if (node.async) {

            head = "for (var " + (iter) + " = _esdown.asyncIter(" + (node.right.text) + "), " + (iterResult) + "; ";
            head += "" + (iterResult) + " = " + (this.awaitYield(context, iter + ".next()")) + ", ";

          } else {

            head = "for (var " + (iter) + " = _esdown.iter(" + (node.right.text) + "), " + (iterResult) + "; ";
            head += "" + (iterResult) + " = " + (iter) + ".next(), ";
          }

          head += "!" + (iterResult) + ".done;";
          head = this.syncNewlines(node.left.start, node.right.end, head);
          head += this.input.slice(node.right.end, node.body.start);

          if (node.left.type === "VariableDeclaration") {

            decl = "var ";
            binding = node.left.declarations[0].pattern;

          } else {

            binding = this.unwrapParens(node.left);
          }

          var body = node.body.text;

          // Remove braces from block bodies
          if (node.body.type === "Block") body = this.removeBraces(body);
          else body += " ";

          var assign = this.isPattern(binding) ? this.translatePattern(binding, "" + (iterResult) + ".value").join(", ") : "" + (binding.text) + " = " + (iterResult) + ".value";

          var out = "" + (head) + "{ " + (decl) + "" + (assign) + "; " + (body) + "}";

          /*

           For-of loops are implicitly wrapped with try-finally, where the "return"
           is called upon the iterator (if it has such a method) when evaulation leaves
           the loop body.  For performance reasons, and because engines have not
           implemented "return" yet, we avoid this wrapper.

           out = `try { ${ out } } finally { ` +
           `if (${ iterResult } && !${ iterResult }.done && "return" in ${ iter }) ` +
           `${ iter }.return(); }`;

           */

          return out;
        }
      });

      __({
        Module: function(node) {

          // NOTE: Strict directive is included with module wrapper

          var inserted = [],
            temps = this.tempVars(node);

          if (node.lexicalVars) inserted.push(this.lexicalVarNames(node));

          if (temps) inserted.push(temps);

          if (inserted.length > 0) return inserted.join(" ") + " " + this.stringify(node);
        }
      });

      __({
        Script: function(node) {

          return this.Module(node);
        }
      });

      __({
        FunctionBody: function(node) {

          var insert = this.functionInsert(node.parent);

          if (insert) return "{ " + insert + " " + this.removeBraces(this.stringify(node)) + "}";
        }
      });

      __({
        FormalParameter: function(node) {

          if (this.isPattern(node.pattern)) return this.addTempVar(node, null, true);

          return node.pattern.text;
        }
      });

      __({
        RestParameter: function(node) {

          node.parent.createRestBinding = true;

          var p = node.parent.params;

          if (p.length > 1) {

            var prev$0 = p[p.length - 2];
            node.start = prev$0.end;
          }

          return "";
        }
      });

      __({
        ComputedPropertyName: function(node) {

          return this.addComputedName(node);
        }
      });

      __({
        ObjectLiteral: function(node) {

          if (node.computedNames) return this.wrapComputed(node);
        }
      });

      __({
        ArrayLiteral: function(node) {

          if (node.hasSpread) return "(" + this.spreadList(node.elements, true) + ")";
        }
      });

      __({
        MethodDefinitionBegin: function(node) {

          if (node.parent.type === "ClassBody" && node.kind === "constructor") {

            var hasPrivate$0 = node.parent.elements.some(function(elem) {
              return elem.type === "PrivateDeclaration";
            });

            if (hasPrivate$0) node.initPrivate = true;
          }
        }
      });

      __({
        MethodDefinition: function(node) {

          var text;

          switch (node.kind) {

            case "":
            case "constructor":

              text = "function(" + this.joinList(node.params) + ") " + node.body.text;

              break;

            case "async":
            case "async-generator":

              text = this.asyncFunction(node);
              break;

            case "generator":

              text = "function*(" + this.joinList(node.params) + ") " + node.body.text;

              break;

          }

          if (text !== void 0) return node.name.text + ": " + text;
        }
      });

      __({
        PropertyDefinition: function(node) {

          if (node.expression === null) {

            var rawName$0 = this.input.slice(node.name.start, node.name.end);
            return rawName$0 + ": " + node.name.text;
          }
        }
      });

      __({
        VariableDeclaration: function(node) {

          return this.stringify(node).replace(/^(let|const)/, "var");
        }
      });

      __({
        ImportDeclaration: function(node) {

          var moduleSpec = this.modulePath(node.from),
            imports = node.imports;

          if (!imports) return "";

          switch (imports.type) {

            case "NamespaceImport":
              return "var " + imports.identifier.text + " = " + moduleSpec + ";";

            case "DefaultImport":
              return "var " + imports.identifier.text + " = " + moduleSpec + "['default'];";
          }

          var list = [];

          if (imports.specifiers) {

            imports.specifiers.forEach(function(spec) {

              var imported = spec.imported,
                local = spec.local || imported;

              list.push({
                start: spec.start,
                end: spec.end,
                text: local.text + " = " + moduleSpec + "." + imported.text
              });
            });
          }

          if (list.length === 0) return "";

          return "var " + this.joinList(list) + ";";
        }
      });

      __({
        ExportDeclaration: function(node) {
          var __this = this;

          var target = node.exports,
            exports = this.exports,
            ident;

          // Exported declarations
          switch (target.type) {

            case "VariableDeclaration":

              target.declarations.forEach(function(decl) {

                if (__this.isPattern(decl.pattern)) {

                  decl.pattern.patternTargets.forEach(function(x) {
                    return exports[x] = x;
                  });

                } else {

                  ident = decl.pattern.text;
                  exports[ident] = ident;
                }
              });

              return target.text;

            case "FunctionDeclaration":
            case "ClassDeclaration":

              ident = target.identifier.text;
              exports[ident] = ident;
              return target.text;

            case "DefaultExport":

              switch (target.binding.type) {

                case "ClassDeclaration":
                case "FunctionDeclaration":
                  exports["default"] = target.binding.identifier.text;
                  return target.binding.text;
              }

              return "exports[\"default\"] = " + (target.binding.text) + ";";
          }

          var from = target.from,
            fromPath = from ? this.modulePath(from) : "",
            out = "";

          if (!target.specifiers) {

            out += "Object.keys(" + fromPath + ").forEach(function(k) { exports[k] = " + fromPath + "[k]; });";

          } else {

            target.specifiers.forEach(function(spec) {

              var local = spec.local.text,
                exported = spec.exported ? spec.exported.text : local;

              exports[exported] = from ? fromPath + "." + local : local;
            });
          }

          return out;
        }
      });

      __({
        CallExpression: function(node) {

          var callee = node.callee,
            args = node.arguments,
            spread = null,
            calleeText,
            argText;

          if (callee.type === "SuperKeyword") throw new Error("Super call not supported");

          if (node.hasSpread) spread = this.spreadList(args, false);

          if (node.injectThisArg) {

            argText = node.injectThisArg;

            if (spread) argText = argText + ", " + spread;
            else if (args.length > 0) argText = argText + ", " + this.joinList(args);

            return callee.text + "." + (spread ? "apply" : "call") + "(" + argText + ")";
          }

          if (spread) {

            argText = "void 0";

            if (node.callee.type === "MemberExpression") {

              argText = this.addTempVar(node);

              callee.object.text = "(" + (argText) + " = " + (callee.object.text) + ")";
              callee.text = this.MemberExpression(callee) || this.stringify(callee);
            }

            return callee.text + ".apply(" + argText + ", " + spread + ")";
          }
        }
      });

      __({
        SpreadExpression: function(node) {

          node.parent.hasSpread = true;
        }
      });

      __({
        SuperKeyword: function(node) {

          var proto = "__.super",
            p = node.parent,
            elem = p;

          while (elem && elem.type !== "MethodDefinition")
            elem = elem.parent;

          if (elem && elem.static) proto = "__.csuper";

          if (p.type !== "CallExpression") {

            // super.foo...
            p.isSuperLookup = true;

            var pp$0 = this.parenParent(p);

            // super.foo(args);
            if (pp$0[0].type === "CallExpression" && pp$0[0].callee === pp$0[1]) pp$0[0].injectThisArg = "this";
          }

          return proto;
        }
      });

      __({
        MemberExpression: function(node) {

          if (node.isSuperLookup) {

            var prop$0 = node.property.text;

            prop$0 = node.computed ? "[" + prop$0 + "]" : "." + prop$0;

            return node.object.text + prop$0;
          }

          // TODO:  What about super.@x?
          if (node.property.type === "AtName") return this.privateReference(node, node.object.text, node.property.text);
        }
      });

      __({
        BindExpression: function(node) {

          var left = node.left ? node.left.text : null,
            right = node.right.text;

          if (!left) {

            if (node.right.type !== "MemberExpression") throw new Error("Invalid bind expression");

            left = this.addTempVar(node);
            right = "(" + (left) + " = " + (node.right.object.text) + ")." + (node.right.property.text) + "";
          }

          if (node.parent.type === "CallExpression" && node.parent.callee === node) {

            node.parent.injectThisArg = left;
            return "(" + right + ")";
          }

          return "(" + (right) + ").bind(" + (left) + ")";
        }
      });

      __({
        ArrowFunction: function(node) {

          var body = node.body.text;

          if (node.body.type !== "FunctionBody") {

            var insert$0 = this.functionInsert(node);

            if (insert$0) insert$0 += " ";

            body = "{ " + insert$0 + "return " + body + "; }";
          }

          var text = node.kind === "async" ? this.asyncFunction(node, body) : "function(" + this.joinList(node.params) + ") " + body;

          return this.wrapFunctionExpression(text, node);
        }
      });

      __({
        ThisExpression: function(node) {

          return this.renameLexicalVar(node, "this");
        }
      });

      __({
        Identifier: function(node) {

          if (node.value === "arguments" && node.context === "variable") return this.renameLexicalVar(node, "arguments");

          if (node.suffix) return this.input.slice(node.start, node.end) + node.suffix;
        }
      });

      __({
        UnaryExpression: function(node) {

          if (node.operator === "delete" && node.overrideDelete) return "!void " + node.expression.text;

          if (node.operator === "await") return this.awaitYield(this.parentFunction(node), node.expression.text);
        }
      });

      __({
        YieldExpression: function(node) {

          // V8 circa Node 0.11.x does not support yield without expression
          if (!node.expression) return "yield void 0";

          // V8 circa Node 0.11.x does not access Symbol.iterator correctly
          if (node.delegate) {

            var fn$0 = this.parentFunction(node),
              method$0 = isAsyncType(fn$0.kind) ? "asyncIter" : "iter";

            node.expression.text = "_esdown." + (method$0) + "(" + (node.expression.text) + ")";
          }

          return "yield " + node.expression.text;
        }
      });

      __({
        FunctionDeclaration: function(node) {

          if (isAsyncType(node.kind)) return this.asyncFunction(node);
        }
      });

      __({
        FunctionExpression: function(node) {

          return this.FunctionDeclaration(node);
        }
      });

      __({
        ClassDeclaration: function(node) {

          if (node.base) this.fail("Subclassing not supported", node.base);

          return "var " + node.identifier.text + " = _esdown.class(" + (node.base ? (node.base.text + ", ") : "") + "function(__) {" + this.strictDirective() + this.removeBraces(node.body.text) + " });";
        }
      });

      __({
        ClassExpression: function(node) {

          var before = "",
            after = "";

          if (node.base) this.fail("Subclassing not supported", node.base);

          if (node.identifier) {

            before = "function() { var " + node.identifier.text + " = ";
            after = "; return " + node.identifier.text + "; }()";
          }

          return "(" + before + "_esdown.class(" + (node.base ? (node.base.text + ", ") : "") + "function(__) {" + this.strictDirective() + this.removeBraces(node.body.text) + " })" + after + ")";
        }
      });

      __({
        PrivateDeclaration: function(node) {

          var parent = node.parent,
            privateList = parent.privateList,
            init = node.initializer ? node.initializer.text : "void 0",
            ident = node.name.text;

          if (!privateList) privateList = parent.privateList = [];

          privateList.push({
            ident: ident,
            init: init
          });

          return "var " + ident + " = new WeakMap;";
        }
      });

      __({
        AtName: function(node) {

          if (node.parent === "PrivateDeclaration") return;

          var name = "_$" + node.value.slice(1),
            parent = node.parent;

          if (parent.type === "PrivateDeclaration" || parent.type === "MemberExpression" && parent.property === node) {

            return name;
          }

          var thisRef = this.renameLexicalVar(node, "this");

          return this.privateReference(node, thisRef, name);
        }
      });

      __({
        ClassBody: function(node) {
          var __this = this;

          var classIdent = node.parent.identifier,
            hasBase = !! node.parent.base,
            elems = node.elements,
            hasCtor = false,
            insert = [];

          elems.forEach(function(e) {

            if (e.type !== "MethodDefinition") return;

            var text = e.text,
              fn = "__";

            if (e.static) text = text.replace(/^static\s*/, "");

            if (e.kind === "constructor") {

              hasCtor = true;

              // Give the constructor function a name so that the
              // class function's name property will be correct.
              if (classIdent) text = text.replace(/:\s*function/, ": function " + classIdent.value);
            }

            text = "{ " + text + " }";

            if (e.computedNames) text = __this.wrapComputed(e, text);

            if (e.static) fn += ".static";

            e.text = fn + "(" + text + ");";
          });

          // Add a default constructor if none was provided
          if (!hasCtor) {

            var ctorBody$0 = "";

            if (hasBase) ctorBody$0 = "__.csuper.apply(this, arguments);";

            if (node.privateList) {

              if (ctorBody$0) ctorBody$0 = " " + ctorBody$0;
              ctorBody$0 += "__initPrivate(this);";
            }

            if (ctorBody$0) ctorBody$0 = " " + ctorBody$0 + " ";

            var ctor$0 = "function";

            if (classIdent) ctor$0 += " " + classIdent.value;

            ctor$0 += "() {" + ctorBody$0 + "}";

            insert.push("__({ constructor: " + ctor$0 + " });");
          }

          if (node.privateList) insert.push(this.privateInit(node.privateList));

          if (insert.length > 0) {

            if (elems.length === 0) return "{ " + insert.join(" ") + " }";

            elems[elems.length - 1].text += "; " + insert.join(" ");
          }
        }
      });

      __({
        TaggedTemplateExpression: function(node) {

          return "(" + this.stringify(node) + ")";
        }
      });

      __({
        TemplateExpression: function(node) {
          var __this = this;

          var lit = node.literals,
            sub = node.substitutions,
            out = "";

          if (node.parent.type === "TaggedTemplateExpression") {

            out = "(_esdown.callSite(" + "[" + lit.map(function(x) {
              return __this.rawToString(x.raw);
            }).join(", ") + "]";

            // Only output the raw array if it is different from the cooked array
            for (var i$0 = 0; i$0 < lit.length; ++i$0) {

              if (lit[i$0].raw !== lit[i$0].value) {

                out += ", [" + lit.map(function(x) {
                  return JSON.stringify(x.raw);
                }).join(", ") + "]";
                break;
              }
            }

            out += ")";

            if (sub.length > 0) out += ", " + sub.map(function(x) {
              return x.text;
            }).join(", ");

            out += ")";

          } else {

            for (var i$1 = 0; i$1 < lit.length; ++i$1) {

              if (i$1 > 0) out += " + (" + sub[i$1 - 1].text + ") + ";

              out += this.rawToString(lit[i$1].raw);
            }
          }

          return out;
        }
      });

      __({
        CatchClause: function(node) {

          if (!this.isPattern(node.param)) return null;

          var temp = this.addTempVar(node, null, true),
            assign = this.translatePattern(node.param, temp).join(", "),
            body = this.removeBraces(node.body.text);

          return "catch (" + (temp) + ") { let " + (assign) + "; " + (body) + " }";
        }
      });

      __({
        VariableDeclarator: function(node) {

          if (!node.initializer || !this.isPattern(node.pattern)) return null;

          var list = this.translatePattern(node.pattern, node.initializer.text);

          return list.join(", ");
        }
      });

      __({
        AssignmentExpression: function(node) {

          if (node.assignWrap) return node.assignWrap[0] + node.right.text + node.assignWrap[1];

          var left = this.unwrapParens(node.left);

          if (!this.isPattern(left)) return null;

          var temp = this.addTempVar(node),
            list = this.translatePattern(left, temp);

          list.unshift(temp + " = " + node.right.text);
          list.push(temp);

          return "(" + list.join(", ") + ")";
        }
      });

      __({
        isPattern: function(node) {

          switch (node.type) {

            case "ArrayPattern":
            case "ObjectPattern":
              return true;
          }

          return false;
        }
      });

      __({
        parenParent: function(node) {

          var parent;

          for (; parent = node.parent; node = parent)
            if (parent.type !== "ParenExpression") break;

          return [parent, node];
        }
      });

      __({
        unwrapParens: function(node) {

          while (node && node.type === "ParenExpression")
            node = node.expression;

          return node;
        }
      });

      __({
        spreadList: function(elems, newArray) {

          var list = [],
            last = -1;

          for (var i$2 = 0; i$2 < elems.length; ++i$2) {

            if (elems[i$2].type === "SpreadExpression") {

              if (last < i$2 - 1) list.push({
                type: "s",
                args: this.joinList(elems.slice(last + 1, i$2))
              });

              list.push({
                type: "i",
                args: elems[i$2].expression.text
              });

              last = i$2;
            }
          }

          if (last < elems.length - 1) list.push({
            type: "s",
            args: this.joinList(elems.slice(last + 1))
          });

          var out = "(_esdown.spread()";

          for (var i$3 = 0; i$3 < list.length; ++i$3)
            out += "." + (list[i$3].type) + "(" + (list[i$3].args) + ")";

          out += ".a)";

          return out;
        }
      });

      __({
        translatePattern: function(node, base) {
          var __this = this;

          function propGet(name) {

            return /^[\.\d'"]/.test(name) ? "[" + name + "]" : "." + name;
          }

          var outer = [],
            inner = [],
            targets = [];

          node.patternTargets = targets;

          var visit = function(tree, base) {

            var target = tree.target,
              dType = tree.array ? "arrayd" : "objd",
              str = "",
              temp;

            var access = tree.rest ? "" + (base) + ".rest(" + (tree.skip) + ", " + (tree.name) + ")" : tree.skip ? "" + (base) + ".at(" + (tree.skip) + ", " + (tree.name) + ")" : tree.name ? base + propGet(tree.name) : base;

            if (tree.initializer) {

              temp = __this.addTempVar(node);
              inner.push("" + (temp) + " = " + (access) + "");

              str = "" + (temp) + " === void 0 ? " + (tree.initializer) + " : " + (temp) + "";

              if (!tree.target) str = "" + (temp) + " = _esdown." + (dType) + "(" + (str) + ")";

              inner.push(str);

            } else if (tree.target) {

              inner.push("" + (access) + "");

            } else {

              temp = __this.addTempVar(node);
              inner.push("" + (temp) + " = _esdown." + (dType) + "(" + (access) + ")");
            }

            if (tree.target) {

              targets.push(target);

              outer.push(inner.length === 1 ? "" + (target) + " = " + (inner[0]) + "" : "" + (target) + " = (" + (inner.join(", ")) + ")");

              inner.length = 0;
            }

            if (temp) base = temp;

            tree.children.forEach(function(c) {
              return visit(c, base);
            });
          };

          visit(this.createPatternTree(node), base);

          return outer;
        }
      });

      __({
        createPatternTree: function(ast, parent) {
          var __this = this;

          if (!parent) parent = new PatternTreeNode("", null);

          var child, init, skip = 1;

          switch (ast.type) {

            case "ArrayPattern":

              parent.array = true;

              ast.elements.forEach(function(e, i) {

                if (!e) {

                  ++skip;
                  return;
                }

                init = e.initializer ? e.initializer.text : "";

                child = new PatternTreeNode(String(i), init, skip);

                if (e.type === "PatternRestElement") child.rest = true;

                parent.children.push(child);
                __this.createPatternTree(e.pattern, child);

                skip = 1;
              });

              break;

            case "ObjectPattern":

              ast.properties.forEach(function(p) {

                init = p.initializer ? p.initializer.text : "";
                child = new PatternTreeNode(p.name.text, init);

                parent.children.push(child);
                __this.createPatternTree(p.pattern || p.name, child);
              });

              break;

            default:

              parent.target = ast.text;
              break;
          }

          return parent;
        }
      });

      __({
        asyncFunction: function(node, body) {

          var head = "function";

          if (node.identifier) head += " " + node.identifier.text;

          var outerParams = node.params.map(function(x, i) {

            var p = x.pattern || x.identifier;
            return p.type === "Identifier" ? p.value : "__$" + i;

          }).join(", ");

          var wrapper = node.kind === "async-generator" ? "asyncGen" : "async";

          if (body === void 0) body = node.body.text;

          return "" + (head) + "(" + (outerParams) + ") { " + "return _esdown." + (wrapper) + "(function*(" + (this.joinList(node.params)) + ") " + "" + (body) + ".apply(this, arguments)); }";
        }
      });

      __({
        privateReference: function(node, obj, prop) {

          var pp = this.parenParent(node),
            p = pp[0],
            type = "get";

          switch (p.type) {

            case "CallExpression":
              if (p.callee === pp[1]) type = "call";
              break;

            case "AssignmentExpression":
              if (p.left === pp[1]) type = "set";
              break;

            case "PatternProperty":
            case "PatternElement":
              // References within assignment patterns are not currently supported
              return null;

            case "UnaryExpression":
              if (p.operator === "delete") this.fail("Cannot delete private reference", p.expression);

              break;
          }

          var temp;

          switch (type) {

            case "call":
              temp = this.addTempVar(p);
              p.injectThisArg = temp;
              return "_esdown.getPrivate(" + (temp) + " = " + (obj) + ", " + (prop) + ")";

            case "get":
              return "_esdown.getPrivate(" + (obj) + ", " + (prop) + ")";

            case "set":
              temp = this.addTempVar(p);

              p.assignWrap = ["(_esdown.setPrivate(" + (obj) + ", " + (prop) + ", " + (temp) + " = ", "), " + (temp) + ")"];

              return null;
          }
        }
      });

      __({
        rawToString: function(raw) {

          raw = raw.replace(/([^\n])?\n/g, function(m, m1) {
            return m1 === "\\" ? m : (m1 || "") + "\\n\\\n";
          });
          raw = raw.replace(/([^"])?"/g, function(m, m1) {
            return m1 === "\\" ? m : (m1 || "") + '\\"';
          });

          return '"' + raw + '"';
        }
      });

      __({
        isVarScope: function(node) {

          switch (node.type) {

            case "ArrowFunction":
            case "FunctionDeclaration":
            case "FunctionExpression":
            case "MethodDefinition":
            case "Script":
            case "Module":
              return true;
          }

          return false;
        }
      });

      __({
        parentFunction: function(node) {

          for (var p$0 = node.parent; p$0; p$0 = p$0.parent)
            if (this.isVarScope(p$0)) return p$0;

          return null;
        }
      });

      __({
        renameLexicalVar: function(node, name) {

          var fn = this.parentFunction(node),
            varName = name;

          if (fn.type === "ArrowFunction") {

            while (fn = this.parentFunction(fn)) {

              if (fn.type !== "ArrowFunction") {

                if (!fn.lexicalVars) fn.lexicalVars = {};

                fn.lexicalVars[name] = varName = "__" + name;
                break;
              }
            }
          }

          return varName;
        }
      });

      __({
        lexicalVarNames: function(node) {

          var names = node.lexicalVars;

          if (!names) return "";

          return "var " + Object.keys(names).map(function(key) {

              return names[key] + " = " + key;

            }).join(", ") + ";";
        }
      });

      __({
        modulePath: function(node) {

          return node.type === "StringLiteral" ? this.identifyModule(node.value) : this.stringify(node);
        }
      });

      __({
        identifyModule: function(url) {

          var legacy = false;

          url = url.trim();

          if (isLegacyScheme(url)) {

            url = removeScheme(url).trim();
            legacy = true;
          }

          if (typeof this.imports[url] !== "string") {

            this.imports[url] = "_M" + (this.uid++);
            this.dependencies.push({
              url: url,
              legacy: legacy
            });
          }

          return this.imports[url];
        }
      });

      __({
        stringify: function(node) {

          var offset = node.start,
            input = this.input,
            text = "";

          // Build text from child nodes
          node.children().forEach(function(child) {

            if (offset < child.start) text += input.slice(offset, child.start);

            text += child.text;
            offset = child.end;
          });

          if (offset < node.end) text += input.slice(offset, node.end);

          return text;
        }
      });

      __({
        restParamVar: function(node) {

          var name = node.params[node.params.length - 1].identifier.value,
            pos = node.params.length - 1,
            temp = this.addTempVar(node, null, true);

          return "for (var " + (name) + " = [], " + (temp) + " = " + (pos) + "; " + "" + (temp) + " < arguments.length; " + "++" + (temp) + ") " + (name) + ".push(arguments[" + (temp) + "]);";

          return "var " + name + " = " + slice + ";";
        }
      });

      __({
        addComputedName: function(node) {

          for (var p$1 = node.parent; p$1; p$1 = p$1.parent) {

            if (p$1.type === "ObjectLiteral" || p$1.type === "MethodDefinition" && p$1.parent.type === "ClassBody") {

              if (!p$1.computedNames) p$1.computedNames = [];

              var id$0 = "__$" + p$1.computedNames.length;
              p$1.computedNames.push(node.expression.text);

              return id$0;
            }
          }

          return null;
        }
      });

      __({
        wrapComputed: function(node, text) {

          if (node.computedNames) return "_esdown.computed(" + (text || this.stringify(node)) + ", " + node.computedNames.join(", ") + ")";
        }
      });

      __({
        functionInsert: function(node) {
          var __this = this;

          var inserted = [];

          if (node.hasYieldInput) inserted.push("var __yieldin = yield;");

          if (node.lexicalVars) inserted.push(this.lexicalVarNames(node));

          if (node.initPrivate) inserted.push("__initPrivate(this);");

          if (node.createRestBinding) inserted.push(this.restParamVar(node));

          node.params.forEach(function(param) {

            if (!param.pattern) return;

            var name = param.text;

            if (param.initializer) inserted.push("if (" + (name) + " === void 0) " + (name) + " = " + (param.initializer.text) + ";");

            if (__this.isPattern(param.pattern)) inserted.push("var " + __this.translatePattern(param.pattern, name).join(", ") + ";");
          });

          var temps = this.tempVars(node);

          // Add temp var declarations to the top of the insert
          if (temps) inserted.unshift(temps);

          return inserted.join(" ");
        }
      });

      __({
        privateInit: function(fields) {

          var list = fields.map(function(field) {
            return field.ident + ".set(__$, " + field.init + ");";
          });

          var check = "if (" + fields[0].ident + ".has(__$)) " + "throw new Error('Object already initialized');";

          return "function __initPrivate(__$) { " + check + " " + list.join(" ") + " }";
        }
      });

      __({
        addTempVar: function(node, value, noDeclare) {

          var p = this.isVarScope(node) ? node : this.parentFunction(node);

          if (!p.tempVars) p.tempVars = [];

          var name = "__$" + p.tempVars.length;

          p.tempVars.push({
            name: name,
            value: value,
            noDeclare: noDeclare
          });

          return name;
        }
      });

      __({
        tempVars: function(node) {

          if (!node.tempVars) return "";

          var list = node.tempVars.filter(function(item) {
            return !item.noDeclare;
          });

          if (list.length === 0) return "";

          return "var " + list.map(function(item) {

              var out = item.name;

              if (typeof item.value === "string") out += " = " + item.value;

              return out;

            }).join(", ") + ";";
        }
      });

      __({
        strictDirective: function() {

          return this.isStrict ? "" : ' "use strict";';
        }
      });

      __({
        lineNumber: function(offset) {

          return this.parseResult.locate(offset).line;
        }
      });

      __({
        syncNewlines: function(start, end, text) {

          var height = this.lineNumber(end - 1) - this.lineNumber(start);
          return preserveNewlines(text, height);
        }
      });

      __({
        awaitYield: function(context, text) {

          if (context.kind === "async-generator") text = "{ _esdown_await: (" + (text) + ") }";

          return "(yield " + (text) + ")";
        }
      });

      __({
        wrapFunctionExpression: function(text, node) {

          for (var p$2 = node.parent; p$2; p$2 = p$2.parent) {

            if (this.isVarScope(p$2)) break;

            if (p$2.type === "ExpressionStatement") {

              if (p$2.start === node.start) return "(" + text + ")";

              break;
            }
          }

          return text;
        }
      });

      __({
        removeBraces: function(text) {

          return text.replace(/^\s*\{|\}\s*$/g, "");
        }
      });

      __({
        joinList: function(list) {

          var input = this.input,
            offset = -1,
            text = "";

          list.forEach(function(child) {

            if (offset >= 0 && offset < child.start) text += input.slice(offset, child.start);

            text += child.text;
            offset = child.end;
          });

          return text;
        }
      });

      __({
        fail: function(msg, node) {

          throw this.parseResult.createSyntaxError("[esdown] " + msg, node);
        }
      });;
      __({
        constructor: function Replacer() {}
      });

    });

    exports.Replacer = Replacer;


  }).call(this, _M15);

  (function(exports) {

    var Runtime = _M17.Runtime;
    var Replacer = _M15.Replacer;

    var SIGNATURE = "/*=esdown=*/";

    var WRAP_CALLEE = "(function(fn, deps, name) { " +

      "function obj() { return {} } " +

        // CommonJS:
      "if (typeof exports !== 'undefined') " + "fn(require, exports, module); " +

        // AMD:
      "else if (typeof define === 'function' && define.amd) " + "define(['require', 'exports', 'module'].concat(deps), fn); " +

        // DOM global module:
      "else if (typeof window !== 'undefined' && name) " + "fn(obj, window[name] = {}, {}); " +

        // Hail Mary:
      "else " + "fn(obj, {}, {}); " +

      "})";

    var WRAP_HEADER = "function(require, exports, module) { " + "'use strict'; " + "function __load(p, l) { " + "module.__es6 = !l; " + "var e = require(p); " + "if (e && e.constructor !== Object) e.default = e; " + "return e; " + "} ";

    var WRAP_FOOTER = "\n\n}";

    function sanitize(text) {

      // From node/lib/module.js/Module.prototype._compile
      text = text.replace(/^\#\!.*/, '');

      // From node/lib/module.js/stripBOM
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

      return text;
    }

    function wrapRuntimeModules() {

      return Object.keys(Runtime).map(function(key) {

        return "(function() {\n\n" + Runtime[key] + "\n\n}).call(this);\n\n";

      }).join("");
    }

    function translate(input, options) {
      if (options === void 0) options = {};

      input = sanitize(input);

      if (options.runtime) input = "\n" + wrapRuntimeModules() + input;

      // Node modules are wrapped inside of a function expression, which allows
      // return statements
      if (options.functionContext) input = "(function(){" + input + "})";

      var replacer = options.replacer || new Replacer,
        output = replacer.replace(input, {
          module: options.module
        });

      // Remove function expression wrapper for node-modules
      if (options.functionContext) output = output.slice(12, - 2);

      if (options.wrap) {

        // Doesn't make sense to create a module wrapper for a non-module
        if (!options.module) throw new Error("Cannot wrap a non-module");

        output = wrapModule(
          output,
          replacer.dependencies.map(function(d) {
            return d.url;
          }),
          options.global);
      }

      return output;
    }

    function wrapModule(text, dep, global) {

      return SIGNATURE + WRAP_CALLEE + "(" + WRAP_HEADER + text + WRAP_FOOTER + ", " + JSON.stringify(dep) + ", " + JSON.stringify(global || "") + ");";
    }

    function isWrapped(text) {

      return text.indexOf(SIGNATURE) === 0;
    }

    exports.translate = translate;
    exports.wrapModule = wrapModule;
    exports.isWrapped = isWrapped;


  }).call(this, _M8);

  (function(exports) {

    var Path = _M3;
    var FS = _M2;

    var NODE_PATH = typeof process !== "undefined" && process.env["NODE_PATH"] || "",
      NOT_PACKAGE = /^(?:\.{0,2}\/|[a-z]+:)/i;

    var Module = module.constructor,
      packageRoots;

    function isFile(path) {

      var stat;

      try {
        stat = FS.statSync(path)
      } catch (x) {}

      return stat && stat.isFile();
    }

    function isDirectory(path) {

      var stat;

      try {
        stat = FS.statSync(path)
      } catch (x) {}

      return stat && stat.isDirectory();
    }

    function getFolderEntry(dir) {

      var path;

      // Look for an ES entry point (default.js)
      path = Path.join(dir, "default.js");

      if (isFile(path)) return {
        path: path
      };

      // Look for a legacy entry point (package.json or index.js)
      path = Module._findPath("./", [dir]);

      if (path) return {
        path: path,
        legacy: true
      };

      return null;
    }

    function locateModule(path, base) {

      if (isPackageSpecifier(path)) return locatePackage(path, base);

      if (path.charAt(0) !== "." && path.charAt(0) !== "/") return {
        path: path
      };

      path = Path.resolve(base, path);

      if (isDirectory(path)) return getFolderEntry(path);

      return {
        path: path
      };
    }

    function isPackageSpecifier(spec) {

      return !NOT_PACKAGE.test(spec);
    }

    function locatePackage(name, base) {

      if (NOT_PACKAGE.test(name)) throw new Error("Not a package specifier");

      var pathInfo;

      if (!packageRoots) packageRoots = NODE_PATH.split(Path.delimiter).map(function(v) {
        return v.trim();
      });

      var list = Module._nodeModulePaths(base).concat(packageRoots);

      list.some(function(root) {

        pathInfo = getFolderEntry(Path.resolve(root, name));

        if (pathInfo) return true;
      });

      if (!pathInfo) throw new Error("Package " + (name) + " could not be found.");

      return pathInfo;
    }

    exports.locateModule = locateModule;
    exports.isPackageSpecifier = isPackageSpecifier;
    exports.locatePackage = locatePackage;


  }).call(this, _M14);

  (function(exports) {

    var FS = _M2;
    var REPL = _M11;
    var VM = _M12;
    var Path = _M3;
    var Util = _M13;

    var Style = _M4.ConsoleStyle;
    var parse = _M9.parse;
    var translate = _M8.translate;
    var isPackageSpecifier = _M14.isPackageSpecifier,
      locateModule = _M14.locateModule;

    var Module = module.constructor;

    function formatSyntaxError(e, filename) {

      var msg = e.message,
        text = e.sourceText;

      if (filename === void 0 && e.filename !== void 0) filename = e.filename;

      if (filename) msg += "\n    " + (filename) + ":" + (e.line) + "";

      if (e.lineOffset < text.length) {

        var code$0 = "\n\n" + text.slice(e.lineOffset, e.startOffset) + Style.bold(Style.red(text.slice(e.startOffset, e.endOffset))) + text.slice(e.endOffset, text.indexOf("\n", e.endOffset)) + "\n";

        msg += code$0.replace(/\n/g, "\n    ");
      }

      return msg;
    }

    function addExtension() {

      var moduleLoad = Module._load;

      Module.prototype.importSync = function(path) {

        if (/^node:/.test(path)) {

          path = path.slice(5);
          this.__es6 = false;

        } else {

          this.__es6 = true;
        }

        var e = this.require(path);
        if (e && e.constructor !== Object) e.
          default = e;
        return e;
      };

      Module._load = function(request, parent, isMain) {

        if (parent.__es6) {

          var loc$0 = locateModule(request, Path.dirname(parent.filename));

          request = loc$0.path;

          if (loc$0.legacy) parent.__es6 = false;
        }

        var m = moduleLoad(request, parent, isMain);
        parent.__es6 = false;
        return m;
      };

      // Compile ES6 js files
      require.extensions[".js"] = function(module, filename) {

        var text, source;

        try {

          text = source = FS.readFileSync(filename, "utf8");

          // Only translate as a module if the source module is requesting
          // via import syntax
          var m$0 = !! module.parent.__es6;

          text = translate(text, {
            wrap: m$0,
            module: m$0,
            functionContext: !m$0
          });

        } catch (e) {

          if (e instanceof SyntaxError) e = new SyntaxError(formatSyntaxError(e, filename));

          throw e;
        }

        return module._compile(text, filename);
      };
    }

    function runModule(path) {

      addExtension();

      if (isPackageSpecifier(path)) path = "./" + path;

      var loc = locateModule(path, process.cwd());

      // "__load" is defined in the module wrapper and ensures that the
      // target is loaded as a module

      var m = __load(loc.path);

      if (m && typeof m.main === "function") {

        var result$0 = m.main(process.argv);
        Promise.resolve(result$0).then(null, function(x) {
          return setTimeout(function($) {
            throw x
          }, 0);
        });
      }
    }

    function startREPL() {

      // Node 0.10.x pessimistically wraps all input in parens and then
      // re-evaluates function expressions as function declarations.  Since
      // Node is unaware of class declarations, this causes classes to
      // always be interpreted as expressions in the REPL.
      var removeParens = process.version.startsWith("v0.10.");

      addExtension();

      console.log("esdown " + (_esdown.version) + " (Node " + (process.version) + ")");

      var prompt = ">>> ",
        contPrompt = "... ";

      var repl = REPL.start({

        prompt: prompt,

        useGlobal: true,

        eval: function(input, context, filename, cb) {
          var __this = this;

          var text, result, script, displayErrors = false;

          // Remove wrapping parens for function and class declaration forms
          if (removeParens && /^\((class|function\*?)\s[\s\S]*?\n\)$/.test(input)) input = input.slice(1, - 1);

          try {

            text = translate(input, {
              module: false
            });

          } catch (x) {

            // Regenerate syntax error to eliminate parser stack
            if (x instanceof SyntaxError) {

              // Detect multiline input
              if (/^(Unexpected end of input|Unexpected token)/.test(x.message)) {

                this.bufferedCommand = input + "\n";
                this.displayPrompt();
                return;
              }

              x = new SyntaxError(x.message);
            }

            return cb(x);
          }

          try {

            script = VM.createScript(text, {
              filename: filename,
              displayErrors: displayErrors
            });

            result = repl.useGlobal ? script.runInThisContext({
              displayErrors: displayErrors
            }) : script.runInContext(context, {
              displayErrors: displayErrors
            });

          } catch (x) {

            return cb(x);
          }

          if (result instanceof Promise) {

            // Without displayPrompt, asynchronously calling the "eval"
            // callback results in no text being displayed on the screen.

            var token$0 = {};

            Promise.race([

              result,
              new Promise(function(a) {
                return setTimeout(function($) {
                  return a(token$0);
                }, 3000);
              }), ])
              .then(function(x) {

                if (x === token$0) return void cb(null, result);

                __this.outputStream.write(Style.gray("(async) "));
                cb(null, x);
              })
              .
              catch (function(err) {
              return cb(err, null);
            })
              .then(function($) {
                return __this.displayPrompt();
              });

          } else {

            cb(null, result);
          }
        }
      });

      // Override displayPrompt so that ellipses are displayed for
      // cross-line continuations

      if (typeof repl.displayPrompt === "function" && typeof repl._prompt === "string") {

        var displayPrompt$0 = repl.displayPrompt;

        repl.displayPrompt = function(preserveCursor) {

          this._prompt = this.bufferedCommand ? contPrompt : prompt;
          return displayPrompt$0.call(this, preserveCursor);
        };
      }

      function parseAction(input, module) {

        var text, ast;

        try {

          ast = parse(input, {
            module: module
          }).ast;
          text = Util.inspect(ast, {
            colors: true,
            depth: 20
          });

        } catch (x) {

          text = x instanceof SyntaxError ? formatSyntaxError(x, "REPL") : x.toString();
        }

        console.log(text);
      }

      function translateAction(input, module) {

        var text;

        try {

          text = translate(input, {
            wrap: false,
            module: true
          });

        } catch (x) {

          text = x instanceof SyntaxError ? formatSyntaxError(x, "REPL") : x.toString();
        }

        console.log(text);
      }

      var commands = {

        "help": {

          help: "Show REPL commands",

          action: function() {
            var __this = this;

            var list = Object.keys(this.commands).sort(),
              len = list.reduce(function(n, key) {
                return Math.max(n, key.length);
              }, 0);

            list.forEach(function(key) {

              var help = __this.commands[key].help || "",
                pad = " ".repeat(4 + len - key.length);

              __this.outputStream.write(key + pad + help + "\n");
            });

            this.displayPrompt();
          }

        },

        "translate": {

          help: "Translate an ES6 script to ES5 and show the result (esdown)",

          action: function(input) {

            translateAction(input, false);
            this.displayPrompt();
          }
        },

        "translateModule": {

          help: "Translate an ES6 module to ES5 and show the result (esdown)",

          action: function(input) {

            translateAction(input, true);
            this.displayPrompt();
          }
        },

        "parse": {

          help: "Parse a script and show the AST (esdown)",

          action: function(input) {

            parseAction(input, false);
            this.displayPrompt();
          }

        },

        "parseModule": {

          help: "Parse a module and show the AST (esdown)",

          action: function(input) {

            parseAction(input, true);
            this.displayPrompt();
          }

        },
      };

      if (typeof repl.defineCommand === "function") Object.keys(commands).forEach(function(key) {
        return repl.defineCommand(key, commands[key]);
      });
    }

    exports.formatSyntaxError = formatSyntaxError;
    exports.runModule = runModule;
    exports.startREPL = startREPL;


  }).call(this, _M6);

  (function(exports) {

    var Path = _M3;
    var readFile = _M5.readFile;
    var isPackageSpecifier = _M14.isPackageSpecifier,
      locateModule = _M14.locateModule;
    var translate = _M8.translate,
      wrapModule = _M8.wrapModule;
    var Replacer = _M15.Replacer;
    var isLegacyScheme = _M16.isLegacyScheme,
      removeScheme = _M16.removeScheme,
      hasScheme = _M16.hasScheme;


    var Node = _esdown.class(function(__) {

      __({
        constructor: function Node(path, name) {

          this.path = path;
          this.name = name;
          this.edges = new Set;
          this.output = null;
        }
      });
    });

    var GraphBuilder = _esdown.class(function(__) {

      __({
        constructor: function GraphBuilder(root) {

          this.nodes = new Map;
          this.nextID = 1;
          this.root = this.add(root);
        }
      });

      __({
        has: function(key) {

          return this.nodes.has(key);
        }
      });

      __({
        add: function(key) {

          if (this.nodes.has(key)) return this.nodes.get(key);

          var name = "_M" + (this.nextID++),
            node = new Node(key, name);

          this.nodes.set(key, node);
          return node;
        }
      });

      __({
        sort: function(key) {
          var __this = this;
          if (key === void 0) key = this.root.path;

          var visited = new Set,
            list = [];

          var visit = function(key) {

            if (visited.has(key)) return;

            visited.add(key);
            var node = __this.nodes.get(key);
            node.edges.forEach(visit);
            list.push(node);
          };

          visit(key);

          return list;
        }
      });

      __({
        process: function(key, input) {
          var __this = this;

          if (!this.nodes.has(key)) throw new Error("Node not found");

          var node = this.nodes.get(key);

          if (node.output !== null) throw new Error("Node already processed");

          var replacer = new Replacer,
            dir = Path.dirname(node.path);

          replacer.identifyModule = function(path) {

            // REVISIT:  Does not currently allow bundling of legacy modules
            path = locateModule(path, dir).path;
            node.edges.add(path);
            return __this.add(path).name;
          };

          node.output = translate(input, {
            replacer: replacer,
            module: true
          });

          return node;
        }
      });

    });

    function bundle(rootPath, options) {
      if (options === void 0) options = {};

      rootPath = Path.resolve(rootPath);

      var builder = new GraphBuilder(rootPath),
        visited = new Set,
        pending = 0,
        resolver,
        allFetched;

      allFetched = new Promise(function(resolve, reject) {
        return resolver = {
          resolve: resolve,
          reject: reject
        };
      });

      function visit(path) {

        // Exit if module has already been processed
        if (visited.has(path)) return;

        visited.add(path);
        pending += 1;

        readFile(path, {
          encoding: "utf8"
        }).then(function(code) {

          var node = builder.process(path, code);

          node.edges.forEach(function(path) {

            // If we want to optionally limit the scope of the bundle, we
            // will need to apply some kind of filter here.

            // Do not bundle any files that start with a scheme prefix
            if (!hasScheme(path)) visit(path);
          });

          pending -= 1;

          if (pending === 0) resolver.resolve(null);

        }).then(null, function(err) {

          if (err instanceof SyntaxError && "sourceText" in err) err.filename = path;

          resolver.reject(err);
        });
      }

      visit(rootPath);

      return allFetched.then(function($) {

        var nodes = builder.sort(),
          dependencies = [],
          output = "";

        var varList = nodes.map(function(node) {

          if (node.output === null) {

            var path$0 = node.path,
              legacy$0 = "";

            if (isLegacyScheme(path$0)) {

              path$0 = removeScheme(node.path);
              legacy$0 = ", 1";
            }

            dependencies.push(path$0);

            return "" + (node.name) + " = __load(" + (JSON.stringify(path$0)) + "" + (legacy$0) + ")";
          }

          return "" + (node.name) + " = " + (node.path === rootPath ? "exports" : "{}") + "";

        }).join(", ");

        if (varList) output += "var " + varList + ";\n";

        nodes.filter(function(n) {
          return n.output !== null;
        }).forEach(function(node) {

          output += "\n(function(exports) {\n\n" + node.output + "\n\n}).call(this, " + node.name + ");\n";
        });

        if (options.runtime) output = translate("", {
          runtime: true,
          module: true
        }) + "\n\n" + output;

        return wrapModule(output, dependencies, options.global);
      });
    }

    exports.bundle = bundle;


  }).call(this, _M7);

  (function(exports) {

    var FS = _M2;
    var Path = _M3;
    var ConsoleCommand = _M4.ConsoleCommand;
    var readFile = _M5.readFile,
      writeFile = _M5.writeFile;
    var runModule = _M6.runModule,
      startREPL = _M6.startREPL,
      formatSyntaxError = _M6.formatSyntaxError;
    var bundle = _M7.bundle;
    var translate = _M8.translate;




    function getOutPath(inPath, outPath) {

      var stat;

      outPath = Path.resolve(process.cwd(), outPath);

      try {
        stat = FS.statSync(outPath);
      } catch (e) {}

      if (stat && stat.isDirectory()) return Path.resolve(outPath, Path.basename(inPath));

      return outPath;
    }

    function main() {

      new ConsoleCommand({

        execute: function(input) {

          process.argv.splice(1, 1);

          if (input) runModule(input);
          else startREPL();
        }

      }).add("-", {

          params: {

            "input": {

              short: "i",
              positional: true,
              required: true
            },

            "output": {

              short: "o",
              positional: true,
              required: false
            },

            "global": {
              short: "g"
            },

            "bundle": {
              short: "b",
              flag: true
            },

            "runtime": {
              short: "r",
              flag: true
            }
          },

          execute: function(params) {

            var promise = null;

            if (params.bundle) {

              promise = bundle(params.input, {

                global: params.global,
                runtime: params.runtime
              });

            } else {

              promise = params.input ? readFile(params.input, {
                encoding: "utf8"
              }) : Promise.resolve("");

              promise = promise.then(function(text) {

                return translate(text, {

                  global: params.global,
                  runtime: params.runtime,
                  wrap: true,
                  module: true
                });
              });
            }

            promise.then(function(text) {

              if (params.output) {

                var outPath$0 = getOutPath(params.input, params.output);
                return writeFile(outPath$0, text, "utf8");

              } else {

                process.stdout.write(text + "\n");
              }

            }).then(null, function(x) {

              if (x instanceof SyntaxError) {

                var filename$0;

                if (!params.bundle) filename$0 = Path.resolve(params.input);

                process.stdout.write("\nSyntax Error: " + (formatSyntaxError(x, filename$0)) + "\n");
                return;
              }

              setTimeout(function($) {
                throw x
              }, 0);
            });
          }

        }).run();
    }

    exports.translate = translate;
    exports.bundle = bundle;
    exports.parse = _M9.parse;
    exports.main = main;


  }).call(this, _M1);


}, ["fs", "path", "repl", "vm", "util"], "esdown");