/**
 * Associate requests with clients and modules
 * @type {Request}
 */

var Client = require('./Client')
	, Module = require('./Module')

function Request(data) {
	this.mods = data.mods
	console.log('new Request',data)
	this.client = Client(data.id)
}

Request.prototype = {
	// getDependencies => filter previously loaded => Module.getSrc => package 
	getModules: function(cb) {
		var self = this
		
		Module.getModules(this.mods, self.client.mods, function(err, mods) {
			if (err) return cb(err)

			for (var i in mods) {
				for (var j in mods) {
					self.client.mods.push(i+'@'+j)
				}
			}
			cb(null, mods)
		});
	}
}

module.exports = Request