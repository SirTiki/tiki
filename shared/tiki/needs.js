console.debug('tiki/needs ctor')

var needs = module.exports = []

if (!Array.isArray) needs.push('array/isArray')
if (!Array.prototype.filter) needs.push('array/filter')
if (!Array.prototype.map) needs.push('array/map')
if (!Array.prototype.forEach) needs.push('array/forEach')
if (!Array.prototype.indexOf) needs.push('array/indexOf')
if (!Function.prototype.bind) needs.push('function/bind')
if (!Element.prototype.addEventListener) needs.push('element.addeventListener')
if (!Object.keys) needs.push('object/keys')
if (!window.setImmediate) needs.push('setimmediate')

module.exports.polyfill = function(name, mod) {
	switch(name) {
	case 'array/isArray':
		Array.prototype.isArray = mod
		break;
	case 'array/filter':
		Array.prototype.filter = mod
		break;
	case 'array/map':
		Array.prototype.map = mod
		break;
	case 'array/forEach':
		Array.prototype.forEach = mod
		break;
	case 'array/indexOf':
		Array.prototype.indexOf = mod
		break;
	case 'function/bind':
		Function.prototype.bind = mod
		break;
	case 'element.addeventListener':
		Element.prototype.addeventListener = mod
		break;
	case 'object/keys':
		Object.prototype.keys = mod
		break;
	case 'setimmediate':
		window.setimmediate = mod
		break;
	}
}