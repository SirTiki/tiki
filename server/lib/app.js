/**
 * A App with associated local modules and privacies
 */

"use strict";

var url = require('url')
	, _ = require('underscore')

module.exports = App
function App(id) {
	var self = {}
		, defaultPorts

	defaultPorts = {
		'http:' : '80',
		'https:' : '443'
	}

	if (App.all[id]) return App.all[id];

	self.mods = []
	self.id = parseInt(id, 10) || ++App.id
	console.log('App.id: ', self.id)
	App.all[self.id] = self

	self.isAuthorized = isAuthorized
	function isAuthorized(strOrigin) {
		var origin
			, n
			, i

		if (!self.origins.domains.length && !self.origins.patterns.length) {
			return true
		}

		origin = url.parse(strOrigin)

		for (i=0; n=self.origins.domains[i]; i++) {
			n = url.parse('http://'+n)
			if (!n.hostname) {
				n.protocol = 'http:'
				n = url.parse(url.resolve('/',n))
			}
			if (n.hostname === origin.hostname
				&& (n.port === origin.port
					|| defaultPorts[n.protocol].indexOf(origin.port) !== -1
					|| defaultPorts[origin.protocol].indexOf(origin.port) !== -1)) {
				return true
			}
		}

		for (i=0; n=self.origins.patterns[i]; i++) {
			if (n.test(strOrigin)) {
				return true
			}
		}

		return false
	}

	return self
}

_.extend(App, {
	id: 0
, all: {
		'A': {
			origins: {
				domains: ['a0.tikijs.net','a1.tikijs.net','a2.tikijs.net','tikijs.net','a.com','b.com']
			, patterns: []
			}
		}
	}
})