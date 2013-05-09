/**
 * Module management
 */

var util = require('util')
	, fs = require('fs')
	, path = require('path')
	, zlib = require('zlib')

	, requestLib = require('request')
	, semver = require('semver')
	, tar = require('tar')
	, detective = require('detective')

	, $$ = require('lib/twostep')
	, _ = require('lib/_')
	, couchServer = 'http://registry.tikijs.net:5984'

module.exports = {
	getModules: getModules
, getModule: getModule
, validateKey: validateKey
}

function getPublicModule(key, cb) {
	var query = util.format('%s/%s/%s', couchServer, key.name.split('/')[0], key.version || 'latest')
		, ret = {}


	$$([
		$$.stepit(requestLib, query)
	, function($, res, body) {
			if (res.error) return $.end(new Error(res.error))

			$.data.body = body = JSON.parse(res.body)

			if (body.error) return $.end(new Error(query + '\n' + body.reason))

			if (body.versions) {
				body = body.versions[semver.maxSatisfying(Object.keys(body.versions), key.range)]
			}

			requestLib(body.dist.tarball).pipe(zlib.Gunzip()).pipe(tar.Parse({ type: "Directory"}))
				.on('*', function(type, entry) {
					var modulePath

					if (entry.path.substr(-3) !== '.js') return

					entry.path = entry.path.replace(/^package\//,'').replace(/\.js$/,'')
					modulePath = key.name + (key.version ? '@' + key.version : '') + '/' + entry.path
					ret[modulePath] = {src: ''}

					entry.on('data', function(data) {
						ret[modulePath].src += data
					})

					entry.on('end', function() {
						try{detective(ret[modulePath].src)} catch(e) {console.log('===============',ret[modulePath].src); throw new Error(modulePath + e.message)}
						ret[modulePath].meta = {deps: detective(ret[modulePath].src)}
						ret[modulePath].src = 'define("'+modulePath+'", function(require, exports, module) {'+ret[modulePath].src + '\n})\n//@ sourceURL=' + modulePath
					})
				})
				.on('end', $.none())
		}
	, function($) {
			var deps = []
				, body = $.data.body
				, i

			if (_.isSimpleObject(body.dependencies)) {
				for (i in body.dependencies) {
					deps.push(i + '@' + body.dependencies[i])
				}
			}
			$.spread()(null, body.version, ret, deps)
		}
	], cb)
}

function getTikiModule(key, cb) {
	var ret = {}
	, filename = key.name + key.path +'.js'


	$$([
		$$.stepit(fs.readFile, path.join(__dirname, '/../../shared/', filename))
	, function($, src) {
			try{detective(src)} catch(e) {throw new Error(filename + e.message)}
			var dependencies = detective(src)
				, modulePath = key.name + (key.version ? '@' + key.version : '') + key.path

			ret[modulePath] = {meta: {deps: dependencies}}
			ret[modulePath].src = 'define("'+modulePath+'", function(require, exports, module) {'+ src + '\n})\n//@ sourceURL=' + modulePath + '.js'

			$.spread()(null, '0.0.1', ret, dependencies || [])
		}
	], cb)
}

// PUBLIC
function validateKey(key) {
	var re = /([^@\/]+)(@[^\/]+)?(\/.*)?/g
		, path = ''
		, matches
		, latest
		, version
		, range
		, name

	if (typeof key !== 'string') return false

	// parse for versions, e.g., "trycatch@1.0.0/a/b/c"
	matches = re.exec(key)

	name = matches[1]
	matches[2] = matches[2] && matches[2].substr(1)
	version = matches[2]
	path = matches[3]

	latest = version === 'latest' || !version ? 'latest' : null
	version = semver.valid(version)
	range = version === null && typeof matches[2] === 'string' ? semver.validRange(matches[2]) : null

	if (name === '' || (!version && !latest && range === null)) {
		return false
	}
	return {
		name: name,
		path: path || '',
		version: version,
		range: range,
		latest: latest,
		key: key
	}
}

// SS:
// 1. get package
// 2. package.dependencies = meta.deps
// 3. later, filter on already installed

// CS:
// a. dependency metadata will require semver
// b. client-side on require will need to run:
// 		semver.maxSatisfying(Object.keys(meta[dep]), meta[name].deps[dep])
function getModule(name, cb) {
	var key = validateKey(name)

	console.log('getModule: ', name)

	$$([
		function($) {
			if (!key) {
				return new Error('Invalid key passed: '+key)
			}

			if (key.name === 'tiki') {
				getTikiModule(key, $.spread())
			} else {
				getPublicModule(key, $.spread())
			}
		}
	], cb)
}

function getModules(namesOrig, filter, cb) {
	var ret = {}
		, localFilter

	console.log('getModules: ', filter, namesOrig)

	// The filter is for modules we've already loaded
	if ('function' === typeof filter) {
		cb = filter
		filter = []
	}

	localFilter = [].concat(filter)
	namesOrig = [].concat(namesOrig)

	/* ret
	{
		pkgA: {
			v: {
				'1.0.0': {
					mods: {
						'main.js': 'console.log("hello")'
					},
					deps: ['pkgB@0.0.9']
				}
			},
			meta: {
				latest: '1.0.0'
			}
		}
	}
	*/
	// Get module metadata and source
	// Recurse on deps as necessary
	;(function innerGetModules(names, outerNext) {
		$$([
			function($) {
				var group = $.group()

				if (!names.length) return $.end()

				_.each(names, function(name) {
					var innerNext = group()
						, v = validateKey(name)
						, version

					if (v === false) return innerNext(new Error('Invalid module name: '+name))

					version = v.version || v.latest || semver.maxSatisfying(localFilter, v.range)

					if (version && ret[v.name] && ret[v.name][version]) {
						if (localFilter.indexOf(v.name+'@'+version) !== -1) return innerNext()
						if (ret[v.name][version].deps.length) {
							return innerGetModules(ret[v.name][version].deps, innerNext)
						} else return innerNext()
					} else {
						// mark the module as pending in the filter
						getModule(name, function(err, realVersion, source, deps) {
							console.log(v.name+'@'+realVersion + v.path, localFilter)
							for(var q in localFilter) {
								if (localFilter[q].indexOf(v.name+'@'+realVersion + v.path) !== -1) return innerNext()
							}
							localFilter.push(v.name+'@'+realVersion + v.path)
							ret[v.name] = ret[v.name] || {v: {}, meta: {latest: null}}

							if (err) return innerNext(err)

							if (!ret[v.name].v[realVersion]) {
								ret[v.name].v[realVersion] = {mods: source}
							} else {
								_.extend(ret[v.name].v[realVersion].mods, source)
							}
							if (version === 'latest') {
								ret[v.name].meta.latest = realVersion
							}
							if (deps.length) {
								return innerGetModules(deps, innerNext)
							} else return innerNext()
						})
					}
				})
			}
		], outerNext)
	})(namesOrig, function(err) {
		cb(err, ret)
	})
}