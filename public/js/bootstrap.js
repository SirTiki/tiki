console.debug('Bootstrap')
if (typeof window.parent === 'undefined') {
	throw new Error('tiki must be loaded in an iframe');
}

console.debug(window.seed);
// Load the define bootstrap (shims)
eval(window.seed.shim);

// Eval all modules (the define bootstrap will fire when define is defined) 
for (var i in window.seed.mods) {
	console.debug('eval("'+i+'")');
	define.version = window.seed.mods[i].meta.latest;
	eval(window.seed.mods[i].v[window.seed.mods[i].meta.latest].files[i]);
}
window.seed.mods['tiki.defineShim'] = {v: {'0.0.1': {files: {'tiki.defineShim': window.seed.shim}}}, meta: {latest: '0.0.1'}}

window.tiki = require('tiki.Bootstrap');
console.debug("Loading tiki.Bootstrap: " + (!!window.tiki ? 'SUCCESS' : 'FAIL'));
window.tiki.init(window.seed.mods);

document.domain = document.domain;
//@ sourceURL=bootsrap.js