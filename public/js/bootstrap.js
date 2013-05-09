console.debug('Bootstrap')
if (typeof window.parent === 'undefined') {
	throw new Error('tiki must be loaded in an iframe');
}

console.debug(window.seed);
// Load the define bootstrap (shims)
eval(window.seed.shim);

// Eval all modules (the define bootstrap will fire when define is defined) 
for (var name in window.seed.pkgs) {
	console.debug('eval("'+name+'")')
	define.version = window.seed.pkgs[name].meta.latest

	for (var fileName in window.seed.pkgs[name].v[window.seed.pkgs[name].meta.latest].mods) {
		eval(window.seed.pkgs[name].v[window.seed.pkgs[name].meta.latest].mods[fileName].src);
	}
}
window.seed.pkgs['tiki'].v[window.seed.pkgs['tiki'].meta.latest].mods['tiki/defineShim'] = {src: window.seed.shim}

window.tiki = require('tiki/Bootstrap');
console.debug("Loading tiki/Bootstrap: " + (!!window.tiki ? 'SUCCESS' : 'FAIL'));
window.tiki.init(window.seed.pkgs);

document.domain = document.domain;
//@ sourceURL=bootsrap.js