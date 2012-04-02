define('tiki.Bootstrap', ['tiki.define', 'tiki.globalEval', 'tiki.needs', 'tiki.getDependencies', 'tiki.semver'], function (define, globalEval, needs, getDependencies, semver) {
	console.debug('tiki.Bootstrap ctor');
	
	var Bootstrap = {
		mods: null,
		nop: function () {},
		init: function (mods) {
			var i, l, deps;

			console.debug('Bootstrap.init: ', mods);
			this.mods = mods;

			deps = getDependencies('tiki.tiki', this.mods);

			// Client bootstrap modules must be posted separately to maintain sourceURL integrity
			console.log('defineShim: ', this.mods['tiki.defineShim'])

			this.clientBootstrap = [
				this.mods['tiki.defineShim'].v[this.mods['tiki.defineShim'].meta.latest].files['tiki.defineShim'],
				'define.version = "'+this.mods['tiki.define'].meta.latest+'";'+this.mods['tiki.define'].v[this.mods['tiki.define'].meta.latest].files['tiki.define']
			];

			for (i = 0, l = deps.length; i < l; ++i) {
				if (deps[i] === 'tiki.defineShim' || deps[i] === 'tiki.define') continue;
				this.clientBootstrap.push('define.version = "'+this.mods[deps[i]].meta.latest+'";'+this.mods[deps[i]].v[this.mods[deps[i]].meta.latest].files[deps[i]]);
			}
			this.clientBootstrap.push('window.tiki = require("tiki.tiki")');

			this.onMessage.that = this;
			if (window.addEventListener) {
				window.addEventListener('message', this.onMessage, false);
			} else {
				window.attachEvent('onmessage', this.onMessage);
			}

			// This will only execute/eval if require hasn't been loaded
			// Otherwise, the listener will interpret it as an iframe "onready" event
			console.debug('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
			parent.postMessage("e.source.postMessage('require','*')", '*');
		},
		onMessage: function onMessage(e) {
			var i, n, message;

			// Poor man's dynamic bind
			if (this !== onMessage.that) {
				return onMessage.that.onMessage(e);
			}
			
			console.debug('Bootstrap::onMessage', e.data);
			console.debug('origin: ', this.origin)

			if (!this.origin) {
				this.origin = e.origin;
				
				if (e.data === 'require') {
					console.debug('require', Bootstrap.clientBootstrap)
					for (i = 0; n = Bootstrap.clientBootstrap[i]; ++i) {
						console.debug('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
						parent.postMessage(n, '*');
					}
					return;
				}
			} else if (e.data === 'clear') {
				if (typeof this.clear === 'function') {
					this.clear();
				}
				return;
			}
			
			if (e.data === 'bootstrap') {
				return parent.postMessage(Bootstrap.clientBootstrap.join('\n'), '*');
			}

			try {
				message = JSON.parse(e.data);
			} catch (err) {
				throw new Error('Bootstrap::onMessage - Invalid JSON message sent: ' + e.data);
			}

			if (!message.appId) {
				throw new Error('Bootstrap::onMessage - tiki AppId required.');
			}
			this.appId = message.appId;
			
			if (typeof message.paths !== 'string' && Object.prototype.toString.call(message.paths) !== "[object Array]") {
				throw new Error('Bootstrap::onMessage - "paths" must be type String or Array.', '*');
			}

			this.require(message.paths, function (res) {
				console.debug('Bootstrap::onMessage::require-response', res);
				console.debug('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
				parent.postMessage(JSON.stringify({id: message.id, data: res}), '*');
			});
		},
		// Load all remote modules as a single call
		getRemotes: function (paths, cb) {
			console.debug('Bootstrap::getRemotes: ', paths);
			
			if (!paths.length) {
				return cb();
			}
			paths = [].concat(paths);
			
			cb = cb || this.nop;
			var xhr,
				self = this,
				data = {
					origin: this.origin,
					mods: paths,
					appId: this.appId
				};
			
			if (this.id) {
				data.id = this.id;
			} else if (this.tempId) {
				data.tempId = this.tempId;
			} else {
				this.tempId = data.tempId = Math.ceil(Math.random() * 99999999);
				data.time = +new Date();
				data.mods = data.mods.concat(needs);
			}
			
			xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function () {
				if (xhr.readyState !== 4 || this.status !== 200) {
					return;
				}
				var res = xhr.responseText.length ? JSON.parse(xhr.responseText) : {};
				if (res.error) {
					throw new Error(res.error);
				}
				if (res.eval) {
					globalEval(res.eval);
				}

				self.onResponse(res);
				cb(res.mods);
			};
			
			xhr.open('POST', 'http://' + window.location.host + '/combo', true);
			xhr.setRequestHeader('Content-Type', 'application/json');
			xhr.send(JSON.stringify(data));
		},
		onResponse: function (res) {
			var i, n, deps;
			if (res.id) {
				localStorage.id = this.id = res.id;
				
				// Add to in memory dependencies. Not necessary? Handled by Store?
				for (i in res.mods) {
					this.mods[i] = res.mods[i];
				}
				
				// TODO: This could probably be moved to a module
				deps = getDependencies('tiki.main', this.mods);
				for (i = 0; n = deps[i]; ++i) {
					if (typeof res.mods[n] !== 'undefined') {
						console.debug('UPDATE THIS EVAL WITH VERSIONING, RELATIVE PATH: ', res.mods[n])
						define.version = res.mods[n].meta.latest;
						globalEval(res.mods[n].v[res.mods[n].meta.latest].files[n])
					}
				}
				for (i = 0; n = needs[i]; ++i) {
					if (typeof res.mods[n] !== 'undefined') {
						console.debug('UPDATE THIS EVAL WITH VERSIONING, RELATIVE PATH: ', res.mods[n])
						define.version = res.mods[n].meta.latest;
						globalEval(res.mods[n].v[res.mods[n].meta.latest].files[n])
						require(n);
					}
				}
				
				window.tiki = require('tiki.main');
				tiki.init();
			}
		}
	};
	
	Bootstrap.require = Bootstrap.getRemotes;
	
	return Bootstrap;
});
