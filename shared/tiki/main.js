console.debug('tiki/main', Bootstrap)

var Bootstrap = require('tiki/Bootstrap')
	, Store = require('tiki/Store')
	, _ = require('tiki/underscore')
	, getDependencies = require('tiki/getDependencies')
	, step = require('tiki/step')
	, keyParser = require('tiki/keyParser')

window.tiki = module.exports = _.extend(Bootstrap, {
	_init: Bootstrap.init
, init: function(id, pkgs) {
		console.debug('tiki/main::init', pkgs)

		var self = this

		this.id = this.id || id
		if (this.pkgs) {
			// Store all modules in memory
			setTimeout(function() {
					var key
						, i, j, k

					for (i in self.pkgs) {
						for (j in self.pkgs[i].v) {
							Store.setPkgMeta(i, j, self.pkgs[i].v[j].meta || {})
							for (k in self.pkgs[i].v[j].mods) {
								key = keyParser.parse(keyParser.format({version: j, module: k}))
								Store.setMod(key.full, self.pkgs[i].v[j].mods[k])
							}
						}
					}
				}
			, 10)
		} else {
			this.onMessage.that = this
			this._init(pkgs, false)
		}
	}
	// Store remote modules and handle meta data
, onResponse: function(res) {
		console.debug('tiki::onResponse: ', res)
		// when stores are done initializing, store modules
		setTimeout(function() {
			var key
				, i, j, k

			for (i in res.pkgs) {
				for (j in res.pkgs[i].v) {
					Store.setPkgMeta(i, j, res.pkgs[i].v[j].meta || {})
					for (k in res.pkgs[i].v[j].mods) {
						key = keyParser.parse(keyParser.format({version: j, module: k}))
						Store.setMod(key.full, res.pkgs[i].v[j].mods[k])
					}
				}
			}
		},0)
	}

	// Load modules locally or remotely as necessary
, require: function(paths, cb) {
		console.debug('tiki::require')

		var self = this
			, modules
			, path

		if (typeof paths !== 'string' && !Array.isArray(paths)) {
			throw new Error('require(paths)::paths must be a String or Array.','*')
		}

		cb = cb || this.nop
		path = [].concat(paths)
		if (!paths.length) return cb()

		modules = {}

		step(
			function() {
				var parallel = this.parallel()
					, group = this.group()
					, remotePaths = []

				paths.forEach(function(path,i) {
					var next

					if (typeof path !== 'string' || !path) return

					if (typeof Store.getNS(path) !== 'undefined') {
						next = group()
						Store.getMod(path, function(mod) {
							console.debug('Store.getMod returned', path, mod)
							modules[path] = mod
							next()
						})
					} else {
						remotePaths.push(path)
					}
				})

				if (remotePaths.length) {
					self.getRemotes(remotePaths
					, function(pkgs) {
							parallel(null, pkgs)
						})
				} else parallel()
			}
		, function(err, remotes) {
				var group
					, deps
					, i

				if(err) throw err

				group = this.group()

				console.debug('tiki::require::getRemotes: ', remotes, modules, Object.keys(modules))
				for (i in remotes) {
					modules[i] = remotes[i]
				}

				deps = getDependencies(Object.keys(modules)
				, function(path) {
						return (modules[path] && (modules[path].deps || (modules[path].meta && modules[path].meta.deps))) || Store.getMeta(path).deps || []
					})

				console.debug('Dependencies for '+path+': ',deps)
				// Ensure every dependency is included in modules
				deps.forEach(function(name) {
					var next

					if (!modules.hasOwnProperty(name)) {
						next = group()
						Store.getMod(name, function(mod) {
							modules[name] = mod
							next()
						})
					}
				})
			}
		, function() {
				cb(modules)
			})
	}
,	clear: function() {
		console.debug('Clearing Storage')
		Store.clear()
	}
})

// "latest" is a peer of meta, but really, "meta" should be contained in "latest"? => there're going to be versioned depenencies
// "src" should probably contain "latest" or maybe "latest" should contain "src" and we abstract out the top-level meta***