var ESCOMPAT = (function(){

  var SUPPORT = {
    ES2015 : {
      generators : true
    }
  };

  try { window.eval("(function*() {})"); }
  catch (x) { SUPPORT.ES2015.generators = false; }

  return SUPPORT;

}());



