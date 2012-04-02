(function() {
	var meta, mods, version

	console.debug('hotBootstrap');
	mods = window.seed.mods

	if (typeof window.parent === 'undefined') {
		throw new Error('tiki must be loaded in an iframe');
	}

	console.debug(window.seed);
	// Load the define bootstrap (shims)
	mods['tiki.defineShim'] = {v: {'0.0.1': {files: {'tiki.defineShim': window.seed.shim}}}, meta: {latest: '0.0.1'}}
	// Must eval first / manually, object keys have no ordering
	eval(window.seed.shim)


	// Eval all modules (the define bootstrap will fire when define is defined) 
	mods['tiki.getDependencies'] = {v: {}, meta: JSON.parse(localStorage['$tiki.getDependencies'])}
	version = mods['tiki.getDependencies'].meta.latest
	mods['tiki.getDependencies'].v[version] = {files: JSON.parse(localStorage['_tiki.getDependencies@' + version]), meta: mods['tiki.getDependencies'].meta.v[version]}
	for (var i in mods) {
		evalit(i, mods[i])
	}

	mods['tiki.main'] = {v: {}, meta: JSON.parse(localStorage['$tiki.main'])}
	version = mods['tiki.main'].meta.latest
	mods['tiki.main'].v[version] = {files: JSON.parse(localStorage['_tiki.main@' + version]), meta: mods['tiki.main'].meta.v[version]}

	var deps = require('tiki.getDependencies')(mods['tiki.main'].meta.v[version].deps, function(path) {
		var name, ret, val

		path = path.split('@')
		name = path[0]
		version = path[1]

		val = localStorage['$'+name]
		ret = mods[name] = {v: {}, meta: (val && JSON.parse(val)) || (mods[name] && mods[name].meta)}

		console.debug('ADD VERSIONING SUPPORT HERE, DEAL WITH SEMVER')
		version = version || ret.meta.latest
		val = localStorage['_' + name + '@' + version]
		ret.v[version] = {files: (val && JSON.parse(val)) || (mods[name] && mods[name].v[version] && mods[name].v[version].files[name]), meta: ret.meta.v[version]}

		console.debug('tiki.getDependencies: ', path, ret.meta.v[version]);
		return ret.meta.v[version].deps || [];
	})

	deps.push('tiki.main');

	for (var i=0,n; n=deps[i]; ++i) {
		if (n !== 'tiki.defineShim') {
			evalit(n, mods[n])
		} else {
			console.debug('FIX THIS')
		}
	}



	window.tiki = require('tiki.main');
	console.debug("Loading tiki.main: " + (!!window.tiki ? 'SUCCESS' : 'FAIL'));
	window.tiki.init(localStorage.id, mods);

	document.domain = document.domain;

	function evalit(name, mod) {
		for (var j in mod.v) {
			console.log('ADD RELATIVE PATH SUPPORT')
			define.version = j;
			eval(mod.v[j].files[name])
		}
	}
})()




// Fix the issue of hotBoostrap not being a boostrap in any sense... =(
// Currently failing on underscore, neither in seed nor in tiki

//@ sourceURL=hotBoostrap.js