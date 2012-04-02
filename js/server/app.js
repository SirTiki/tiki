/**
 * A App with associated local modules and privacies
 */

var _ = require('underscore')
	, url = require('url')
	, _ = require('underscore')
	, apps = {
			'A': {
				origins: {
					domains: ['a0.tikijs.net','a1.tikijs.net','a2.tikijs.net','tikijs.net','a.com','b.com']
				, patterns: []
				}
			}
		}


function ctor(id) {
	this.mods = []
	this.id = id || ++App.id
	console.log('App.id: ', this.id)
	App.apps[this.id] = this
}


function App(id) {
	if (this instanceof App) return ctor.apply(this,arguments);

	console.log('App.get', id, App.apps[id])
	return App.apps[id] || new App(id)
}
App.prototype = {
	defaultPorts: {
		'http:' : '80',
		'https:' : '443'
	},
	isAuthorized: function(strOrigin) {
		if (!this.origins.domains.length && !this.origins.patterns.length) {
			return true
		}
		
		var origin = url.parse(strOrigin)

		for (var n,i=0; n=this.origins.domains[i]; i++) {
			n = url.parse('http://'+n)
			if (!n.hostname) {
				n.protocol = 'http:'
				n = url.parse(url.resolve('/',n))
			}
			if (n.hostname === origin.hostname && (n.port === origin.port || this.defaultPorts[n.protocol].indexOf(origin.port) !== -1 || defaultPorts[origin.protocol].indexOf(origin.port) !== -1)) {
				return true
			}
		}
		
		for (var n,i=0; n=this.origins.patterns[i]; i++) {
			if (n.test(strOrigin)) {
				return true
			}
		}
		
		return false
	}	
}

_.extend(App, {
	apps: apps
})

module.exports = App