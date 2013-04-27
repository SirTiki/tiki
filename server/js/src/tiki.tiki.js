var listener = typeof arguments !== 'undefined' ? arguments.callee : null;

define('tiki.tiki', ['tiki.define','tiki.globalEval','tiki.getDependencies','tiki.semver'], function(define, globalEval, getDependencies, semver) {
	console.debug('tiki.tiki ctor');
	console.debug('removing old message listeners', listener);
	window.removeEventListener('message', listener);
	var queue, callbacks = [], require;
	
	window.require = require = define.require;
	window.define = define = define.define;

	function tiki(paths, cb) {
		console.debug('tiki(): ',paths);
		var key, n, i, l, v, localPaths = [], remotePaths = [], bailout = [];
		
		cb.paths = paths = [].concat(paths);
		for (i=0,l=paths.length; i<l; ++i) {
			key = paths[i];
			if (!key || typeof define.defined[key] !== 'undefined') continue;

			n = key.split('@');
			v = n[1] || '';
			n = n[0];

			v = semver.maxSatisfying(Store.listVersions(n) || [],v)
			if (v) {
				console.debug('Queue (localStorage): ',n);
				localPaths.push(n+'@'+v);
			} else {
				console.debug('Queue (remote): ',n);
				remotePaths.push(key);
			}
		}

		remotePaths.concat(load(localPaths));

		if (remotePaths.length && !tiki.window) {
			tiki.q.push(arguments);
			return;
		}

		if (remotePaths.length) {
			tiki.getRemotes(remotePaths, function next(remotes) {
				console.debug('tiki().getRemotes cb', remotes);

				for(i=0,l=remotePaths.length; i<l; ++i) {
					key = remotePaths[i];
					n = key.split('@');
					v = n[1] || '';
					n = n[0];

					v = semver.maxSatisfying(Object.keys(remotes[n].v) || [], v)
					remotePaths[i] = n+'@'+v;
				}

				var missing = load(remotePaths);
				if (missing.length) {
					throw new Error('Missing Dependencies: '+missing);
				}
				
				cb(require, define);
			});
		} else cb(require, define);
		
		function load(paths) {
			var name, version, module, ret = [];
			
			var deps = getDependencies(paths, function(path) {
				var v;

				path = path.split('@');
				v = path[1] || '';
				path = path[0];

				v = semver.maxSatisfying(Object.keys(define.defined[path] || {}),v)
				var ret = Store.getMeta(path, v);
				return (ret && ret.deps) || [];
			}).concat(paths);

			for (i=0; n=deps[i]; ++i) {
				n = n.split('@');
				name = n[0];
				version = n[1] || '';

				version = semver.maxSatisfying(Store.listVersions(name) || [], version)

				if (version) {
					module = Store.getMod(name, version);
					if (module === null) {
						ret.push(name+'@'+version);
						continue;
					}
					console.debug('UPDATE THIS EVAL WITH VERSIONING, RELATIVE PATH: ', module)
					define.version = version;
					globalEval(module.files[name]);
				}
			}
			return ret;
		}
	}
	
	tiki.getRemotes = function(paths, cb) {
		console.debug('tiki(), loading from remotes, "'+paths+'"');
		var id = callbacks.push(cb) - 1;
		console.debug('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
		tiki.window.postMessage(JSON.stringify({appId: tiki.appId, id: id, paths: paths}),'*');
	};
	
	tiki.ready = function(e,listener)  {
		console.debug('tiki.ready()');

		queue = queue || window.tiki.q || [];
		window.tiki = tiki;
		window.removeEventListener('message', listener || tiki.ready);
		window.addEventListener('message', tiki.onMessage);
		window.win = tiki.window = (e && e.source) || document.querySelector('iframe[data-tikiid]').contentWindow;
		tiki.window.postMessage('bootstrap','*');
		tiki.appId = document.querySelector('iframe[data-tikiid]').getAttribute('data-tikiid');

		for (var i=0,n; n=queue[i]; ++i) {
			console.debug('Dequeue::'+i,n);
			tiki.apply(null,n);
		}
	};
	
	tiki.onMessage = function(e){
		var key

		try {
			var m = JSON.parse(e.data);
			console.debug('tiki().onMessage: ', m);
		} catch(err) {
			localStorage['tiki'] = e.data;
			console.debug('tiki().onMessage (boostrap): ', {src: e.data});
		}
		if (Object.prototype.toString.call(m) == '[object Object]') {
			for(var i in m.data) {
				for (var j in m.data[i].v) {
					key = i + '@' + j
					console.debug('Checking defined: ', key);
					if (typeof define.defined[key] == 'undefined') {
						console.debug('Eval\'ing: ', key);
						console.debug('UPDATE THIS EVAL WITH VERSIONING, RELATIVE PATH: ', m.data[i].v[j])
						define.version = j;
						globalEval(m.data[i].v[j].files[i]);
					}
					Store.setMod(i, j, m.data[i].v[j]);
				}
			}

			callbacks[m.id](m.data);
			callbacks[m.id] = null;
		}
	};
	
	var Store = {
			mods: {},
			metas: {},
			getMod: function(name, version) {
				var key, keys, files

				if (!this.mods[name]) {
					if ('tiki$' + name in localStorage) {
						try {
							this.metas[name] = JSON.parse(localStorage['tiki$' + name])
						} catch(e) {
							console.debug('Corrupted metadata (' + name + '): ', localStorage['tiki$' + name])

							// if metadata's corrupted, purge references to module from localStorage
							this.remove(name)
						}
					}

					this.mods[name] = {v: {}, meta: this.metas[name]}
				}

				if (!this.metas[name]) {
					return null
				}

				version = version || this.metas[name].latest
				key = 'tiki_' + name + '@' + version

				if (!this.mods[name].v[version]) {
					if (key in localStorage) {
						try {
							files = JSON.parse(localStorage[key])
						} catch(e) {
							delete localStorage[key]
							this.setMeta(name, version, null)
						}

						this.mods[name].v[version] = {files: files, meta: this.metas[name].v[version]}
					}
				}

				return this.mods[name].v[version] || null
			},
			setMod: function(name, version, mod) {
				var self = this

				if (typeof name !== 'string' || typeof version !== 'string' || typeof mod !== 'object') {
					throw new Error('Invalid params: ' + JSON.stringify(arguments))
				}

				this.setMeta(name, version, mod.meta)

				this.mods[name] = this.mods[name] || {v: {}, meta: this.metas[name] || {}}
				this.mods[name].v[version] = mod

				if (!this.metas[name].latest || version > this.metas[name].latest) {
					this.metas[name].latest = version
				}

				setTimeout(function() {
					localStorage['tiki_' + name + '@' + version] = JSON.stringify(mod.files)
					localStorage['tiki$' + name] = JSON.stringify(self.metas[name])
				}, 0);
			},
			getMeta: function(name, version) {
				if (!this.metas[name]) {
					if ('tiki$' + name in localStorage) {
						try {
							this.metas[name] = JSON.parse(localStorage['tiki$' + name])
						} catch(e) {
							this.remove(name)
						}
					} else {
						return null
					}
				}

				version = version || this.metas[name].latest
				return this.metas[name].v[version] || null
			},
			setMeta: function(name, version, meta) {
				if (typeof name !== 'string' || typeof version !== 'string' || typeof meta !== 'object') {
					throw new Error('Invalid params: ' + JSON.stringify(arguments))
				}

				if (this.metas[name] && this.metas[name].v[version] && meta === null) {
					delete this.metas[name].v[version]
					return
				}

				this.metas[name] = this.metas[name] || {v: {}, meta: {}}
				this.metas[name].v[version] = meta

				if (!this.metas[name].latest || version > this.metas[name].latest) {
					this.metas[name].latest = version
				}

				localStorage['tiki$' + name] = JSON.stringify(this.metas[name])
			},
			listVersions: function(name) {
				this.getMeta(name);
				if (this.metas[name]) {
					return Object.keys(this.metas[name].v);
				}
				return null;
			},
			remove: function(name) {
				var keys = Object.keys(localStorage), i=0, l=keys.length

				// don't lock up the UI 
				;(function doit() {
					setTimeout(function() {
						if (keys[i].indexOf('tiki_' + name) === 0) {
							delete localStorage[keys[i]]
						}
						if (++i<l) doit()
					}, 0)
				})()
				delete this.mods[name];
				delete this.meta[name];
				delete localStorage['tiki$'+name];
			}
	};

	/*
	 * configuration settings 
	 */
	tiki.config = function(opts) {
		appid = opts.id;
		debug = opts.debug;
		if (debug) {
//			tiki.clear = clear;
		}
	};

	/*
	 * localStorage.clear() for all subs 
	 */
	tiki.clear = function() {
		console.debug('tiki.clear');
		localStorage.clear();
		this.window.postMessage('clear','*');
	};
	
	if (!window.tiki) {
		console.debug('FROM CACHE');
		// loaded from cache
		queue = tiki.q = [];
		window.addEventListener('message', function(e) {
			tiki.ready(e, arguments.callee);
		});
	} else {
		console.debug('NOT FROM CACHE');
		tiki.ready();
	}
	
	return tiki;
});


// when loading from cache, we're requesting remotes before tiki.ready()