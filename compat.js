var ESCOMPAT = (function(){
  var geval = eval;
  function run(tests) {
    var failures = tests.map(function(test) {
      var success = false;
      try {
        success = geval(test);
      } catch(x) {}
      return success;
    }).filter(function(result){return !result});
    return failures.length === 0;
  }

  var SUPPORT = {
    ES2015 : {
      generators : run(
        ["function *gen() {yield 5}; a = gen(); a.next().value === 5;"]
      ),
      const : run(
        ["const fooxyz = 1; fooxyz = 4; fooxyz === 1;"]
      ),
      templateLiterals : run(
        ["var aaa = 'Hello', bbb = 'World'; `${aaa} ${bbb}` === 'Hello World'"]
      )
    }
  };

  return SUPPORT;

}());



