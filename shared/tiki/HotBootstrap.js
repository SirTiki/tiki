console.debug('tiki.HotBootstrap ctor');

var define = require('tiki/main')
	, globalEval = require('tiki/globalEval')
	, needs = require('tiki/needs')

// do whatever's necessary to get to tiki.Main (localStorage)
// somehow try and leverage Bootstrap code if possible

module.exports = {}
