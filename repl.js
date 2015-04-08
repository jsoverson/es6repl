
// Majority portion from Kevin Smith's esdown repl http://esparse.org/esdown/repl/
// esdown license included below.

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

var terminal = document.querySelector(".es6repl");

// Adapted from underscore
var escapeHTML = (function () {
  "use strict";

  // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  function createEscaper(map) {

    function escaper(match) {
      return map[match]
    }

    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + Object.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');

    return function (string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  }

  return createEscaper(escapeMap);

})();

function replEval() {
  return window.eval(arguments[0])
}

window.onload = function () {
  "use strict";

  var HELP_TEXT = [

    "",
    "[babel v" + babel.version + "]",
    "",
    "This REPL will translate ES6+ syntax and execute the resulting " +
    "code in your current JavaScript engine.",
    "",
    "The following REPL commands are supported:",
    "",
    ".help                  Display this help message",
    ".clear                 Clear the terminal output",
    ".load                  Load a script from a URL",
    ".translate             Translate script code to ES5",
    ".translateModule       Translate module code to ES5",
    "\n",

  ].join("\n");

  var MAX_CONSOLE_LINES = 100,
    NO_OUTPUT = {},
    NEWLINE = /\r\n?|\n/g;

  function Literal(text) {
    this.text = text
  }

  var replCommands = {

    help: function () {
      return new Literal(HELP_TEXT)
    },
    clear: function () {
      return clearLines(1), NO_OUTPUT
    },
    translate: function (code) {
      return new Literal(babel.transform(code))
    },
    translateModule: function (code) {
      //return new Literal(esdown.translate(code, {module: true}))
    },
    parse: function (code) {
      return esdown.parse(code).ast
    },
    parseModule: function (code) {
      return esdown.parse(code, {module: true}).ast
    },
    link: function () {
      return new Literal(generateLink())
    }
  };

  var history = {
    list: [""],
    max: 50,
    current: 0,
    add: function (str) {
      var len = this.list.length;
      this.list[len - 1] = str;
      this.list.push("");
      this.current = len;
    },
    back: function (str) {
      this._check(str);
      if (this.current > 0) this.current -= 1;
      return this.list[this.current];
    },

    forward: function (str) {
      this._check(str);
      if (this.current < this.list.length - 1) this.current += 1;
      return this.list[this.current];
    },

    _check: function (str) {
      if (str !== this.list[this.current]) {
        this.current = this.list.length - 1;
        this.list[this.current] = str;
      }
    }
  };

  function isOpaque(obj) {
    return obj instanceof Node;
  }

  function elem(s) {
    return document.querySelector(s);
  }

  function elems(s) {
    return document.querySelectorAll(s);
  }

  function stylize(str, styleType) {
    str = escapeHTML(str);
    if (styleType) str = '<span class="js-' + styleType + '">' + str + '</span>';
    return str;
  }

  function isRecoverableError(e, code) {
    if (/(\n[ \t]*){2}$/.test(code)) return false;

    // assume if the error was at the very end it's due to incomplete code
    return e && e.name === 'SyntaxError' && e.pos === code.length;
  }

  function formatError(error) {

    var message = "" + error,
      stack = message;

    if ("stack" in error) {

      stack = error.stack;

      var m = /(^|\s)replEval[:@\s]/.exec(stack);

      if (m) {

        var start = Math.max(stack.lastIndexOf("\n", m.index + 1), 0);
        stack = stack.slice(0, start);
      }

      if (stack.indexOf(message) < 0)
        stack = message + "\n" + stack;
    }

    return escapeHTML(stack).replace(/^.+/, function (m) {

      return "<span class='js-error'>" + m + "</span>";
    });
  }

  function replRun() {
    var code = input.value;

    if (bufferedInput)
      code = bufferedInput + "\n" + code;

    advanceInput(function () {
      var executed = false,
        output = "",
        result,
        error;

      if (code.charAt(0) === ".") {
        var cmd = code.slice(1).replace(/\s[\s\S]*/g, "");
        if (typeof replCommands[cmd] === "function") {
          executed = true;
          try {
            result = replCommands[cmd](code.slice(cmd.length + 1).trim())
          }
          catch (x) {
            error = x || {}
          }
        }
      }

      if (!executed) {
        executed = true;
        try {
          code = babel.transform(code, { blacklist: ["useStrict"] }).code;
          //if (code.indexOf("*") >= 0 && window.regenerator) code = regenerator.compile(code).code;
          result = replEval(code);
        } catch (x) {
          error = x || {};
        }
      }

      if (isRecoverableError(error, code)) {
        bufferedInput = code;
      } else if (result !== NO_OUTPUT) {
        bufferedInput = "";
        output =
          error ? formatError(error) :
            result instanceof Literal ? escapeHTML(result.text) :
              prettyPrint(result, {stylize: stylize, isOpaque: isOpaque});
      }
      return output;

    });
  }

  function autoIndent(last) {
    var indent = last.split(NEWLINE).pop().replace(/\S[\s\S]*/, "");
    if (/[\{\[]\s*$/.test(last)) indent += "  ";
    return indent;
  }

  function advanceInput(fn) {

    var value = input.value;

    history.add(value);

    addLine(escapeHTML(value), prompt.className);
    setInputValue("");

    var output = fn && fn() || "";

    if (output)
      addLine(output);

    prompt.className = bufferedInput ? "prompt cont" : "prompt";

    clearLines(MAX_CONSOLE_LINES);

    if (bufferedInput)
      setInputValue(autoIndent(value));

    input.focus();
  }

  function clearLines(max) {

    var list = terminal.getElementsByTagName("div");

    for (var count = list.length; count-- > max;)
      terminal.removeChild(list[0]);
  }

  function addLine(html, promptClass) {
    var line = document.createElement("div");
    line.className = "output-line";
    line.innerHTML = html || " ";

    if (promptClass) {

      var span = document.createElement("span");
      span.className = promptClass;
      line.insertBefore(span, line.firstChild);
      line.className += " echo";
    }

    terminal.insertBefore(line, input.parentNode);
  }

  function abort() {
    bufferedInput = "";
    advanceInput();
  }

  function scrollToBottom() {
    terminal.scrollTop = terminal.scrollHeight;
  }

  function onKeyPress(evt) {
    if (evt.keyCode === 13) {
      if (!evt.shiftKey && !evt.ctrlKey) {
        replRun();
        evt.preventDefault();
      }
    }
    scrollToBottom();
  }

  function setInputValue(value) {

    input.value = value;
    input.selectionStart = value.length;
    input.selectionEnd = value.length;
    scrollToBottom();
  }

  function isCursorRow(row) {

    var val = input.value;

    if (!val)
      return true;

    var start = input.selectionStart;

    if (start !== input.selectionEnd)
      return false;

    if (row === "first") {

      var index = val.search(NEWLINE);
      return index < 0 || index >= start;

    } else if (row === "last") {

      return start >= val.length - val.split(NEWLINE).pop().length;

    } else {

      return false;
    }
  }

  function onKeyDown(evt) {
    // CTL-C, ESC
    if (evt.ctrlKey && evt.keyCode === 67 || evt.keyCode === 27) {
      abort();
      evt.preventDefault();
      return;
    }

    // Up arrow
    if (evt.keyCode === 38 && isCursorRow("first")) {
      setInputValue(history.back(input.value));
      evt.preventDefault();
      return;
    }

    // Down arrow
    if (evt.keyCode === 40 && isCursorRow("last")) {
      setInputValue(history.forward(input.value));
      evt.preventDefault();
      return;
    }
  }

  function onClick() {
    if (!window.getSelection || window.getSelection().isCollapsed)
      input.focus();
  }

  function onPaste() {
    scrollToBottom();
  }

  function createHidden() {
    var e = document.createElement(input.nodeName);
    e.className = "hidden";
    e.rows = 1;
    input.parentNode.appendChild(e);
    return e;
  }

  function loadFromHash() {
    var m = /____(.+)/.exec(window.location.hash);

    if (m) {
      var program = decodeURIComponent(m[1]);
      runProgram(program)
      //input.value = decodeURIComponent(m[1]);
      //resizeInput();
    }
  }

  function runProgram(program) {
    program.split('\n').forEach(function(line){
      input.value = line;
      replRun();
      scrollToBottom();
    })
  }

  function generateLink() {
    function isNotCommand(text) {return text.charAt(0) !== ".";}
    function innerText(el) {return el.innerText.trim()}

    var out = [].map.call(elems("div.echo"), innerText).filter(isNotCommand).join("\n");
    out = "____" + encodeURIComponent(out);

    window.location.hash = out;

    return window.location.toString().replace(/#[\s\S]*/, "") + "#" + out;
  }

  var input = elem(".terminal-input"),
    hidden = createHidden(),
    prompt = elem(".es6repl div.input-line span"),
    bufferedInput = "";

  terminal.addEventListener("click", onClick, false);
  input.addEventListener("keypress", onKeyPress, false);
  input.addEventListener("keydown", onKeyDown, false);
  input.addEventListener("paste", onPaste, false);

  input.focus();

  window.print = function (str) {
    addLine(str + "")
  };

  if (window.console) {
    var consoleLog = window.console.log;
    window.console.log = function (arg) {
      window.print(arg);
      consoleLog.apply(this, arguments);
    };
  }

  loadFromHash();

};

