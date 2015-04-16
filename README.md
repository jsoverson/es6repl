es6repl
-------

This is an embeddable implementation of console.js that transpiles ES6 to ES5 code before evaluation.

The intended use this is via an iframe for blogging, documentation, or experimentation purposes.

## Usage

* Go to [the repl](http://jsoverson.github.io/es6repl).
* Type in the code you want to display by default.
* Enter `.link` in the repl.
* Copy the link for distribution or iframe embedding.
* (Alternately) Copy the "share" link in the upper right of the console.

## Notes

The babel blacklist is populated with features the browser tests to natively support. If there are differences between browsers
it is likely differences in behavior (maybe in dev release channels) or unavoidable differences in the transpiled es5 version of a feature.

## History

* Initially a port of @zenparsing's esdown repl, it eventually was rewritten as a separate CodeMirror-based repl (jsconsole) with a babel transformed es6 implementation exposed here.

## Examples

* [Destructuring](http://jsoverson.github.io/es6repl/#__v2:let%20%7B%20objectProperty%20%3A%20localVariable%20%7D%20%3D%20%7B%20objectProperty%20%3A%20%22objectValue%22%20%7D&&localVariable)
* [Template Strings](http://jsoverson.github.io/es6repl/#__v2:var%20name%20%3D%20%22Bob%22%2C%20time%20%3D%20%22today%22%3B&&%60Hello%20%24%7Bname%7D%2C%20how%20are%20you%20%24%7Btime%7D%3F%60)
* [Default Values & Object shorthand](http://jsoverson.github.io/es6repl/#__v2:function%20point(x%20%3D%200%2C%20y%20%3D%200)%20%7B%0A%09return%20%7B%20x%2C%20y%20%7D%0A%7D&&point())
* [Arrow Functions](http://jsoverson.github.io/es6repl/#__v2:%5B1%2C2%2C3%2C4%5D.map(%20x%20%3D%3E%20x%20*%202%20))
* [Classes](http://jsoverson.github.io/es6repl/#__v2:class%20Person%20%7B%0A%20%20constructor(name)%20%7B%0A%20%20%20%20this.name%20%3D%20name%3B%0A%20%20%7D%0A%20%20greet(person)%20%7B%0A%20%20%20%20console.log('Hello%20'%20%2B%20person.name%20%2B%20'%2C%20my%20name%20is%20'%20%2B%20this.name)%3B%0A%20%20%7D%0A%7D&&let%20carol%20%3D%20new%20Person('carol')%3B&&let%20bob%20%3D%20new%20Person('bob')%3B&&carol.greet(bob)%3B)

