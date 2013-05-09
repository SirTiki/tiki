console.debug('tiki/needs ctor')

var needs = module.exports = []

if (!Array.isArray) needs.push('array/isArray')
if (!Array.prototype.filter) needs.push('array/filter')
if (!Array.prototype.map) needs.push('array/map')
if (!Array.prototype.forEach) needs.push('array/forEach')
if (!Array.prototype.indexOf) needs.push('array/indexOf')
if (!Function.prototype.bind) needs.push('function/bind')
if (!Element.prototype.addEventListener) needs.push('Element.addEventListener')
if (!Object.keys) needs.push('object/keys')
if (!window.setImmediate) needs.push('setImmediate')