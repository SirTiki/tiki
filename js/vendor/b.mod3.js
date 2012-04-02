define('b.mod3',['b.mod2'],function(mod2) {
  console.debug('b.mod3 ctor');
  return {id: 'b.mod3', mod2: mod2};
});