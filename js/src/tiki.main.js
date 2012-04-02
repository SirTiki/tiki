define('tiki.main', ['tiki.Bootstrap','tiki.Store','tiki.underscore','tiki.getDependencies','tiki.step'], function(Bootstrap,Store,_,getDependencies,step) {
	console.debug('tiki.main', Bootstrap);

	var tiki = _.extend(Bootstrap, {
		_init: Bootstrap.init,
		init: function(id, mods) {
			console.debug('tiki.main::init', mods)

			this.id = this.id || id
			if (this.mods) {
				var self = this
				// Store all modules in memory
				setTimeout(function() {
					for (var i in self.mods) {
						for (var j in self.mods[i].v) {
							Store.setMod(i, j, self.mods[i].v[j])
						}
					}
				},10)
			} else {
				this.onMessage.that = this
				this._init(mods, false)
			} 
		},
		// Store remote modules and handle meta data
		onResponse: function(res) {
			console.debug('tiki::onResponse: ', res);
			// when stores are done initializing, store modules
			setTimeout(function() {
				for (var i in res.mods) {
					for (var j in res.mods[i].v) {
						Store.setMod(i, j, res.mods[i].v[j]);
					}
				}
			},0);
		},
		
		// Load modules locally or remotely as necessary
		require: function(paths,cb) {
			console.debug('tiki::require');
	
			if (typeof paths !== 'string' && !Array.isArray(paths)) {
				throw new Error('require(paths)::paths must be a String or Array.','*');
			}
			cb = cb || this.nop;
			path = [].concat(paths);
			if (!paths.length) return cb();
	
			var self = this,
				modules = {};
			
			step(function() {
				var parallel = this.parallel(),
					group = this.group(),
					remotePaths = [];
				
				paths.forEach(function(path,i) {
					if (typeof path !== 'string' || !path) return;
					
					if (typeof Store.getNS(path) !== 'undefined') {
						var next = group();
						Store.getMod(path, function(mod) {
							console.debug('Store.getMod returned', path, mod);
							modules[path] = mod;
							next();
						});
					} else {
						remotePaths.push(path);
					}
				});
		
				if (remotePaths.length) {
					self.getRemotes(remotePaths, function(mods) {
						parallel(null, mods);
					});
				} else parallel();
			}, function(err, remotes) {
				if(err) throw err;

				var group = this.group();
				
				console.debug('tiki::require::getRemotes: ', remotes, modules, Object.keys(modules));
				for (var i in remotes) {
					modules[i] = remotes[i];
				}
				
				var deps = getDependencies(Object.keys(modules), function(path) {
					return (modules[path] && (modules[path].deps || (modules[path].meta && modules[path].meta.deps))) || Store.getMeta(path).deps || [];
				});

				console.debug('Dependencies for '+path+': ',deps);
				// Ensure every dependency is included in modules
				deps.forEach(function(name) {
					if (!modules.hasOwnProperty(name)) {
						var next = group();
						Store.getMod(name, function(mod) {
							modules[name] = mod;
							next();
						});
					}
				});
			}, function() {
				cb(modules);
			});
		},
		clear: function() {
			Store.clear();
		}
	});
	
	return tiki;
});




// "latest" is a peer of meta, but really, "meta" should be contained in "latest"? => there're going to be versioned depenencies
// "src" should probably contain "latest" or maybe "latest" should contain "src" and we abstract out the top-level meta***