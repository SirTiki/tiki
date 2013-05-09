console.debug('tiki/getDependencies ctor')
// Calculate all the dependency names given an array of names, paths
// TODO: Maintain cache across calls?
module.exports =  function(names, pkgs) {
	var cache = {},
		fn = typeof pkgs === 'function' ? pkgs : getDeps

	return doit([].concat(names))

	function getDeps(path) {
		var pkg = pkgs[path.split('/')[0]]

		if (typeof pkg === 'undefined' || typeof pkg.v[pkg.meta.latest].mods[path] === 'undefined') {
			console.debug('Seed: ',pkgs)
			throw new Error('Dependency "'+path+'" not in seed.')
		}

		return pkg.v[pkg.meta.latest].mods[path].meta.deps || []
	}

	function doit(path) {
		var paths
			, deps
			, ret
			, i, l

		if (cache[path]) {
			return cache[path]
		}

		paths = Array.isArray(path) ? path : fn(path)
		deps = paths.concat()
		ret = {}

		for (i=0, l=paths.length; i<l; ++i) {
			deps = deps.concat(doit(paths[i]))
		}

		for (i=0, l=deps.length; i<l; ++i) {
			ret[deps[i]] = null
		}

		return cache[path] = Object.keys(ret)
	}
}