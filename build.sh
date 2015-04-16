#!/bin/bash

uglifyjs node_modules/babel/node_modules/babel-core/browser.js -c -m -o babel.min.js
uglifyjs bower_components/codemirror/lib/codemirror.js bower_components/codemirror/mode/javascript/javascript.js  -c -m -o codemirror.bundle.js
uglifyjs bower_components/jsconsole/dist/console.js -c -m -o console.min.js
cat ./bower_components/codemirror/lib/codemirror.css ./bower_components/codemirror/theme/eclipse.css style.css | cssmin > build-style.css