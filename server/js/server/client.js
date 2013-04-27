/**
 * Representation of a single client install
 */

"use strict"

var _ = require('underscore')

function ctor(id) {
	if (Client.clients[id]) return Client.clients[id];
	
	this.mods = []
	this.id = parseInt(id) || ++Client.id
	console.log('Client.id: ', this.id)
	Client.clients[this.id] = this
}

function Client(id) {
	if (this instanceof Client) return ctor.apply(this,arguments);

	id = parseInt(id)
	console.log('Client.get', Client.clients[id])
	return Client.clients[id] || new Client(id)
}
Client.prototype = {
}
_.extend(Client, {
	id: 0,
	clients: {},
})

module.exports = Client