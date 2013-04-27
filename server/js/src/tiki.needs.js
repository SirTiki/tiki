define('tiki.needs', function() {
	console.debug('tiki.needs ctor');
	
	var needs = [];

	if (!Array.isArray) needs.push('Array.isArray');
	if (!Array.prototype.filter) needs.push('Array.filter');
	if (!Array.prototype.map) needs.push('Array.map');
	if (!Array.prototype.forEach) needs.push('Array.forEach');
	if (!Array.prototype.indexOf) needs.push('Array.indexOf');
	if (!Function.prototype.bind) needs.push('Function.bind');
	if (!Element.prototype.addEventListener) needs.push('Element.addEventListener');
	if (!Object.keys) needs.push('Object.keys');
	if (!window.setImmediate) needs.push('setImmediate');
	
	return needs;
});