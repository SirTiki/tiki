/**
 * Associate requests with clients and modules
 * @type {Request}
 */

"use strict";

var Client = require('lib/client')
	, Module = require('lib/module')
	, $$ = require('lib/twostep')

module.exports = Request
function Request(data) {
	var client = Client(data.id)
		, pkgs = data.pkgs.concat(client.pkgs)

	console.log('new Request', data, client.pkgs)

	// getDependencies => filter previously loaded => Module.getSrc => package 
	function getModules(cb) {
		$$([
			$$.stepit(Module.getModules, pkgs, client.pkgs)
		, function($, pkgs) {
				var i, j, k

				for (i in pkgs) {
					for (j in pkgs[i].v) {
						for (k in pkgs[i].v[j].mods) {
							k = k.replace(i, '')
							if (client.pkgs.indexOf(i+'@'+j + k) === -1) {
								client.pkgs.push(i+'@'+j + k);
							}
						}
					}
				}
				console.log('client.pkgs: ', JSON.stringify(client.pkgs))
				cb(null, pkgs)

			}
		], cb)
	}

	return {
		getModules: getModules
	, client: client
	}
}