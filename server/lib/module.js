/**
 * Module management
 */

var util = require('util')
	, fs = require('fs')
	, vm = require('vm')
	, path = require('path')
	, zlib = require('zlib')
	, requestLib = require('request')
	, semver = require('semver')
	, tar = require('tar')
	, $$ = require('lib/twostep')
	, _ = require('lib/_')
	, couchServer = 'http://localhost:5984/registry/_design/app/_rewrite'

module.exports = Module
function Module() {
	// PRIVATE
	function getPublicModule(key, cb) {
		var query = util.format('%s/%s/%s', couchServer, key.name, key.version || key.latest || '')
			, ret = {}

		console.log('Querying URL: ', query)

		$$([
			$$.stepit(requestLib, query)
		, function($, res, body) {
				if (res.error) return $.end(new Error(res.error))

				$.data.body = body = JSON.parse(res.body)

				console.log(query, '\n', body)
				if (body.error) return $.end(new Error(query + '\n' + body.reason))

				if (body.versions) {
					body = body.versions[semver.maxSatisfying(Object.keys(body.versions), key.range)]
				}

				requestLib(body.dist.tarball).pipe(zlib.Gunzip()).pipe(tar.Parse({ type: "Directory"}))
					.on('*', function(type, entry) {
						entry.path = entry.path.replace(/^package\//,'').replace(/\.js$/,'')
						ret[entry.path] = ''

						entry.on('data', function(data) {
							ret[entry.path] += data
						})

						entry.on('end', function() {
							ret[entry.path] += '\n//@ sourceURL=' + name + '/' + entry.path
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
		, filename = key.name+'.js'

		console.log('getTikiModule')

		$$([
			$$.stepit(fs.readFile, path.join(__dirname, '/../src/', filename))
		, function($, data) {
				var deps
				, called = false

				function define() {
					called = true

					if (Array.isArray(arguments[0])) {
						deps = arguments[0]
					} else if (Array.isArray(arguments[1])) {
						deps = arguments[1]
					}
				}

				define.amd = true

				data += '\n//@ sourceURL=' + name
				ret[name] = data

				vm.runInNewContext(data, {define: define}, filename)

				if (!called) {
					return new Error('Failed to load: ' + filename)
				}

				console.log('dependencies: ', deps)
				$.spread()(null, '0.0.1', ret, deps || [])
			}
		], cb)
	}

	// PUBLIC
	function validateKey(key) {
		var v
			, latest
			, version
			, range
			, name

		console.log('validateKey: ', key)
		if (typeof key !== 'string') return false

		// parse for versions, e.g., "trycatch@1.0.0"
		v = key.split('@')

		latest = v[1] === 'latest' || !v[1] ? 'latest' : null
		version = semver.valid(v[1])
		range = version === null && typeof v[1] === 'string' ? semver.validRange(v[1]) : null
		name = v[0]

		console.log({
			name: name,
			version: version,
			range: range,
			latest: latest
		})
		if (name === '' || (!version && !latest && range === null)) {
			return false
		}
		return {
			name: name,
			version: version,
			range: range,
			latest: latest
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

				if (key.name.split('.')[0] === 'tiki') {
					getTikiModule(key, $.first())
				} else {
					getPublicModule(key, $.first())
				}
			}
		], cb)
	}

	function getModules(namesOrig, filter, cb) {
		var ret = {}
			, localFilter

		console.log('getModules: ', namesOrig)

		// The filter is for modules we've already loaded
		if ('function' === typeof filter) {
			cb = filter
			filter = []
		}

		localFilter = [].concat(filter)
		namesOrig = [].concat(namesOrig)

		/* ret
		{
			modA: {
				v: {
					'1.0.0': {
						files: {
							'main.js': 'console.log("hello")'
						},
						deps: ['modB@0.0.9']
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
		;(function doit(names, outerNext) {
			$$([
				function($) {
					var group = $.group()

					if (!names.length) return $.end()

					_.each(names, function(name) {
						var innerNext = group()
							, v = Module.validateKey(name)
							, version

						if (v === false) return innerNext(new Error('Invalid module name: '+name))

						version = v.version || v.latest || semver.maxSatisfying(localFilter, v.range)

						if (version && ret[v.name] && ret[v.name][version]) {
							if (localFilter.indexOf(v.name+'@'+version) !== -1) return innerNext()
							if (ret[v.name][version].deps.length) {
								return doit(ret[v.name][version].deps, innerNext)
							} else return innerNext()
						} else {
							// mark the module as pending in the filter
							Module.getModule(name, function(err, realVersion, source, deps) {
								if (localFilter.indexOf(v.name+'@'+realVersion) !== -1) return innerNext()
								localFilter.push(v.name+'@'+realVersion)
								ret[v.name] = {v: {}, meta: {latest: null}}

								if (err) return innerNext(err)

								ret[v.name].v[realVersion] = {files: source, meta: { deps: deps } }
								if (version === 'latest') {
									ret[v.name].meta.latest = realVersion
								}
								if (deps.length) {
									return doit(deps, innerNext)
								} else return innerNext()
							})
						}
					})
				}
			], outerNext)
		})(namesOrig, _.partial(cb, undefined, ret))
	}

	return {
		getModules: getModules
	, getModule: getModule
	, validateKey: validateKey
	}
}