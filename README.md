es6repl
-------

This is a minimally adapted version of @zenparsing's esdown
repl intended for use as an iframe for blogging/documentation purposes.

## Usage

* Go to [the repl](http://jsoverson.github.io/es6repl)
* Type in the code you want to display by default
* Enter `.link` in the repl
* Copy the link for distribution or iframe embedding.

## Differences from esdown repl

* Generated links are executed command-by-command vs as a whole program.
* Styled to be more amenable to embedding.

## Examples

* [Destructuring](http://jsoverson.github.io/es6repl/#____let%20%7B%20objectProperty%20%3A%20localVariable%20%7D%20%3D%20%7B%20objectProperty%20%3A%20%22objectValue%22%20%7D%0AlocalVariable)
* [Template Strings](http://jsoverson.github.io/es6repl/#____var%20name%20%3D%20%22Bob%22%2C%20time%20%3D%20%22today%22%3B%0A%60Hello%20%24%7Bname%7D%2C%20how%20are%20you%20%24%7Btime%7D%3F%60)
* [Default Values & Object shorthand](http://jsoverson.github.io/es6repl/#____function%20point(x%20%3D%200%2C%20y%20%3D%200)%20%7B%0Areturn%20%7B%20x%2C%20y%20%7D%0A%7D%0Apoint())
* [Arrow Functions](http://jsoverson.github.io/es6repl/#____%5B1%2C2%2C3%2C4%5D.map(%20x%20%3D%3E%20x%20*%202%20))
* [Classes](http://jsoverson.github.io/es6repl/#____class%20Person%20%7B%0A%20%20constructor(name)%20%7B%0A%20%20%20%20this.name%20%3D%20name%3B%0A%20%20%7D%0A%20%20greet(person)%20%7B%0A%20%20%20%20console.log('Hello%20'%20%2B%20person.name%20%2B%20'%2C%20my%20name%20is%20'%20%2B%20this.name)%3B%0A%20%20%7D%0A%7D%0Alet%20carol%20%3D%20new%20Person('carol')%3B%0Alet%20bob%20%3D%20new%20Person('bob')%3B%0Acarol.greet(bob)%3B)

## License

ESDown license below.

Copyright (c) 2014 zenparsing (Kevin Smith)

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

