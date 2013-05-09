var define = require('tiki/define')
	, globalEval = require('tiki/globalEval')
	, needs = require('tiki/needs')
	, getDependencies = require('tiki/getDependencies')
	, semver = require('tiki/semver')
	, Bootstrap

console.debug('tiki/Bootstrap ctor')

Bootstrap = {
	pkgs: null,
	nop: function () {},
	init: function (pkgs) {
		var deps
			, name
			, i, l

		console.debug('Bootstrap.init: ', pkgs)
		this.pkgs = pkgs

		deps = ['tiki/define'].concat(getDependencies('tiki/tiki', this.pkgs))

		// Client bootstrap modules must be posted separately to maintain sourceURL integrity
		this.clientBootstrap = [
			this.pkgs['tiki'].v[this.pkgs['tiki'].meta.latest].mods['tiki/defineShim'].src
		]

		for (i = 0, l = deps.length; i < l; ++i) {
			if (deps[i] === 'tiki/defineShim') continue
			name = deps[i].split('/')[0]
			this.clientBootstrap.push('define.version = "'+this.pkgs[name].meta.latest+'";'+this.pkgs[name].v[this.pkgs[name].meta.latest].mods[deps[i]].src)
		}
		this.clientBootstrap.push("var listener = typeof arguments !== 'undefined' ? arguments.callee : null; console.debug('removing old message listeners', listener); window.removeEventListener('message', listener);window.tiki = require('tiki/tiki')")

		this.onMessage.that = this
		if (window.addEventListener) {
			window.addEventListener('message', this.onMessage, false)
		} else {
			window.attachEvent('onmessage', this.onMessage)
		}

		// This will only execute/eval if require hasn't been loaded
		// Otherwise, the listener will interpret it as an iframe "onready" event
		console.debug('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
		parent.postMessage("e.source.postMessage('require','*')", '*')
	},
	onMessage: function onMessage(e) {
		var i, n, message

		// Poor man's dynamic bind
		if (this !== onMessage.that) {
			return onMessage.that.onMessage(e)
		}

		console.debug('Bootstrap::onMessage', e.data)
		console.debug('origin: ', this.origin)

		if (!this.origin) {
			this.origin = e.origin

			if (e.data === 'require') {
				console.debug('require', Bootstrap.clientBootstrap)
				for (i = 0; n = Bootstrap.clientBootstrap[i]; ++i) {
					console.debug('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
					parent.postMessage(n, '*')
				}
				return
			}
		} else if (e.data === 'clear') {
			if (typeof this.clear === 'function') {
				this.clear()
			}
			return
		}

		if (e.data === 'bootstrap') {
			return parent.postMessage(Bootstrap.clientBootstrap.join('\n'), '*')
		}

		try {
			message = JSON.parse(e.data)
		} catch (err) {
			throw new Error('Bootstrap::onMessage - Invalid JSON message sent: ' + e.data)
		}

		if (!message.appId) {
			throw new Error('Bootstrap::onMessage - tiki AppId required.')
		}
		this.appId = message.appId

		if (typeof message.paths !== 'string' && Object.prototype.toString.call(message.paths) !== "[object Array]") {
			throw new Error('Bootstrap::onMessage - "paths" must be type String or Array.', '*')
		}

		this.require(message.paths, function (res) {
			console.debug('Bootstrap::onMessage::require-response', res)
			console.debug('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
			parent.postMessage(JSON.stringify({id: message.id, data: res}), '*')
		})
	},
	// Load all remote modules as a single call
	getRemotes: function (paths, cb) {
		console.debug('Bootstrap::getRemotes: ', paths)

		if (!paths.length) {
			return cb()
		}
		paths = [].concat(paths)

		cb = cb || this.nop
		var xhr,
			self = this,
			data = {
				origin: this.origin,
				pkgs: paths,
				appId: this.appId
			}

		if (this.id) {
			data.id = this.id
		} else if (this.tempId) {
			data.tempId = this.tempId
		} else {
			this.tempId = data.tempId = Math.ceil(Math.random() * 99999999)
			data.time = +new Date()
			data.pkgs = data.pkgs.concat(needs)
		}

		xhr = new XMLHttpRequest()
		xhr.onreadystatechange = function () {
			if (xhr.readyState !== 4 || this.status !== 200) {
				return
			}
			var res = xhr.responseText.length ? JSON.parse(xhr.responseText) : {}
			if (res.error) {
				throw new Error(res.error)
			}
			if (res.eval) {
				globalEval(res.eval)
			}

			self.onResponse(res)
			cb(res.pkgs)
		}

		xhr.open('POST', 'http://' + window.location.host + '/combo', true)
		xhr.setRequestHeader('Content-Type', 'application/json')
		xhr.send(JSON.stringify(data))
	},
	onResponse: function (res) {
		var deps
			, pkgName
			, i, n, j

		if (res.id) {
			localStorage.id = this.id = res.id

			// Add to in memory dependencies. Not necessary? Handled by Store?
			for (i in res.pkgs) {
				this.pkgs[i] = res.pkgs[i]
			}

			// TODO: This could probably be moved to a module
			deps = getDependencies('tiki/main', this.pkgs)
			for (i = 0; n = deps[i]; ++i) {
				pkgName = n.split('/')[0]
				if (typeof res.pkgs[pkgName] !== 'undefined') {
					console.debug('UPDATE THIS EVAL WITH VERSIONING, RELATIVE PATH: ', res.pkgs[pkgName])
					define.version = res.pkgs[pkgName].meta.latest
					for (j in res.pkgs[pkgName].v[res.pkgs[pkgName].meta.latest].mods) {
						console.log(j)
						globalEval(res.pkgs[pkgName].v[res.pkgs[pkgName].meta.latest].mods[j].src)
					}
				}
			}
			for (i = 0; n = needs[i]; ++i) {
				if (typeof res.pkgs[n] !== 'undefined') {
					console.debug('UPDATE THIS EVAL WITH VERSIONING, RELATIVE PATH: ', res.pkgs[n])
					define.version = res.pkgs[n].meta.latest
					// There should only be one
					for (j in res.pkgs[n].v[res.pkgs[n].meta.latest].mods) {
						globalEval(res.pkgs[n].v[res.pkgs[n].meta.latest].mods[j].src)
						needs.polyfill(n, require(j))
					}
				}
			}

			// Avoid circular dependency creation
			window.tiki = define.require('tiki/main')
			tiki.init()
		}
	}
}

Bootstrap.require = Bootstrap.getRemotes
module.exports = Bootstrap