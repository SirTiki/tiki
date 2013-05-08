/**
 * Associate requests with clients and modules
 * @type {Request}
 */

"use strict";

var Client = require('./client')
	, Module = require('./module')
	, $$ = require('lib/twostep')

module.exports = Request
function Request(data) {
	var client = Client(data.id)
		, mods = data.mods.concat(client.mods)

	console.log('new Request', data)

	// getDependencies => filter previously loaded => Module.getSrc => package 
	function getModules(cb) {
		$$([
			$$.stepit(Module.getModules, mods, client.mods)
		, function($, mods) {
				var i
					, j

				for (i in mods) {
					for (j in mods[i].v) {
						if (client.mods.indexOf(i+'@'+j) === -1) {
							client.mods.push(i+'@'+j);
						}
					}
				}
				console.log('client.mods: ', JSON.stringify(client.mods))
				cb(null, mods)

			}
		], cb)
	}

	return {
		getModules: getModules
	}
}