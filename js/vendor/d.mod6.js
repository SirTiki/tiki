define('d.mod6',['c.mod5','c.mod4'],function(mod5,mod4) {
  console.debug('d.mod6 ctor');
  return {id: 'd.mod6', mod5: mod5, mod4: mod4};
});