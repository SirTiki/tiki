/**
 * Associate requests with clients and modules
 * @type {Request}
 */

var Client = require('./client')
	, Module = require('./module')

function Request(data) {
	this.mods = data.mods
	console.log('new Request',data)
	this.client = Client(data.id)
	this.mods = this.mods.concat(this.client.mods)
}

Request.prototype = {
	// getDependencies => filter previously loaded => Module.getSrc => package 
	getModules: function(cb) {
		var self = this
		
		Module.getModules(this.mods, self.client.mods, function(err, mods) {
			if (err) return cb(err)

			for (var i in mods) {
				for (var j in mods[i].v) {
					if (self.client.mods.indexOf(i+'@'+j) === -1) {
						self.client.mods.push(i+'@'+j);
					}
				}
			}
			console.log('client.mods: ', JSON.stringify(self.client.mods))
			cb(null, mods)
		});
	}
}

module.exports = Request