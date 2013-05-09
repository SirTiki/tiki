(function() {
	var meta, pkgs, version, tikiPkg

	console.debug('hotBootstrap')
	pkgs = window.seed.pkgs
	version = pkgs.tiki.meta.latest
	tikiPkg = pkgs.tiki.v[version]

	if (typeof window.parent === 'undefined') {
		throw new Error('tiki must be loaded in an iframe')
	}

	console.debug(window.seed)
	tikiPkg.mods['tiki/defineShim'] = {src: window.seed.shim, meta: {deps: []}}
	// Load the define bootstrap (shims)
	// Must eval first / manually, object keys have no ordering
	eval(window.seed.shim)


	// Eval all modules (the define bootstrap will fire when define is defined) 
	tikiPkg.mods['tiki/getDependencies'] = {meta: JSON.parse(localStorage['$tiki@' + version + '/getDependencies']), src: JSON.parse(localStorage['_tiki@' + version + '/getDependencies'])}
	for (var j in tikiPkg.mods) {
		if (j !== 'tiki/defineShim') {
			evalit(j)
		}
	}
	tikiPkg.mods['tiki/main'] = {meta: JSON.parse(localStorage['$tiki@' + version + '/main']), src: JSON.parse(localStorage['_tiki@' + version + '/main'])}

	var getDependencies = require('tiki/getDependencies')
	var deps = getDependencies(tikiPkg.mods['tiki/main'].meta.deps, function(path) {
		var name, ret, val

		path = path.split('/')
		name = path.shift()
		fullPath = name + '@' + version + '/' + path.join('/')
		path = name + '/' + path.join('/')

		tikiPkg.mods[path] = {meta: JSON.parse(localStorage['$'+fullPath]), src: JSON.parse(localStorage['_'+fullPath])}

		console.debug('tiki/getDependencies: ', path, tikiPkg.mods[path])
		return tikiPkg.mods[path].meta.deps || []
	})

	deps.push('tiki/main')

	for (var i=0,n; n=deps[i]; ++i) {
		if (n !== 'tiki/defineShim') {
			evalit(n)
		} else {
			console.debug('FIX THIS')
		}
	}

	window.tiki = require('tiki/main')
	console.debug("Loading tiki/main: " + (!!window.tiki ? 'SUCCESS' : 'FAIL'))
	window.tiki.init(localStorage.id, pkgs)

	document.domain = document.domain

	function evalit(name) {
		define.version = version
		eval(tikiPkg.mods[name].src)
	}
})()




// Fix the issue of hotBoostrap not being a boostrap in any sense... =(
// Currently failing on underscore, neither in seed nor in tiki

//@ sourceURL=hotBoostrap.js