/**
 * Representation of a single client install
 */

"use strict";

var _ = require('underscore')

module.exports = Client
function Client(id) {
	var self = {}

	if (Client.all[id]) return Client.all[id]

	self.pkgs = []
	self.id = parseInt(id, 10) || ++Client.id
	console.log('Client.id: ', self.id)
	Client.all[self.id] = self

	return self
}

_.extend(Client, {
	id: 0
, all: {}
})