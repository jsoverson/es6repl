
var container = document.getElementById('es6repl'),
  link = document.querySelector("#link"),
  clear = document.querySelector('#clear'),
  undo = document.querySelector('#undo');

var repl = new Console(container);

var replCommands = {
  link : function(code) {
    return {
      completionValue : window.location.href.replace(/#.*$/,'') + "#" + generateLink(commands)
    };
  }
};

repl.evaluate = function(code) {
  var commandMatch;
  if (commandMatch = code.match(/^\.(\w+)/)) {
    var command = commandMatch[1];
    if (replCommands[command]) return replCommands[command]();
    else return { error : true, completionValue : new Error('REPL command .' + command + ' not defined in this console.')};
  }
  var out = {};
  try {
    var blacklist = ["useStrict"];
    if (ESCOMPAT.ES2015.generators) blacklist.push('regenerator');
    if (ESCOMPAT.ES2015.const) blacklist.push('es6.constants');
    if (ESCOMPAT.ES2015.templateLiterals) blacklist.push('es6.templateLiterals');
    code = babel.transform(code, { blacklist: blacklist }).code;
    out.completionValue = eval.call(null, code);
  } catch(e) {
    out.error = true;
    out.completionValue = e;
    var lines = code.split('\n');
    var lastLineNumber = lines.length;
    var lastLineLength = lines[lastLineNumber - 1].length;
    out.recoverable = (
      e instanceof SyntaxError &&
      e.message.match('^[^:]*: Unexpected token') &&
      e.loc.line === lastLineNumber &&
      e.loc.column === lastLineLength
    );
  }
  return out;
};

var commands = [],
  _manualHashChange = false,
  originalHash = window.location.hash;

if (originalHash) {
  undo.href = originalHash;
  undo.style.display = 'inline';
}

repl.on('entry', function(entry) {
  commands.push(entry.input);
  var fragment = generateLink(commands);
  updateHash(fragment);
});

function updateHash(fragment) {
  startHashChange();
  window.location.hash = fragment;
  link.href = window.location.hash;
  endHashChange();
}

var startHashChange = function() {
  _manualHashChange = true;
};

var endHashChange = debounce(function() {
  setTimeout(function(){
    _manualHashChange = false;
  },0);
}, 100);

function generateLink(commands) {
  return '__v2:' + commands.filter(function(command){return !command.match(/^\.\w+/)}).map(encodeURIComponent).join('&&');
}

repl.wrapLog(console);

function loadFromHash() {
  var m = /__v2:(.+)/.exec(window.location.hash);

  if (m) {
    //undo.href = window.location.hash;
    //undo.style.display = 'inline';
    repl.resetOutput();
    commands.length = 0;
    var passedCommands = m[1].split('&&').map(function(hash){ return decodeURIComponent(hash)});
    passedCommands.forEach(function(command,i){
      repl.exec(command);
    })
  }
}

window.onhashchange = function(){
  if (!_manualHashChange) {
    loadFromHash()
  }
};

clear.addEventListener('click', function(e){
  if (!(e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    repl.resetOutput();
    window.location.hash = "";
    link.href="#";
    return false;
  }
});

link.addEventListener('click', function(e){
  if (!(e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    repl.exec('.link');
    return false;
  }
});

undo.addEventListener('click', function(e){
  window.location = undo.href;
});


loadFromHash();

// from http://davidwalsh.name/javascript-debounce-function
function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}
