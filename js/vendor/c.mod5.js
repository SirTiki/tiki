define('c.mod5',['b.mod3','b.mod2'],function(mod3,mod2) {
  console.debug('c.mod5 ctor');
  return {id: 'c.mod5',mod3: mod3, mod2: mod2};
});