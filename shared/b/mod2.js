define('b.mod2',['a.mod1','a.mod0'],function(mod1,mod0) {
  console.debug('b.mod2 ctor');
  return {id: 'b.mod2', mod1: mod1, mod0: mod0};
});