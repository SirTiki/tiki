/**
 * Module management
 */

var url = require('url')
	, util = require('util')
	, fs = require('fs')
	, vm = require('vm')
	, zlib = require('zlib')
	, step = require('stepup')
	, requestLib = require('request')
	, semver = require('semver')
	, tar = require('tar')
	, couchServer = 'http://localhost:5984/registry/_design/app/_rewrite'


Module = {
	validateKey: function(key) {
		console.log('validateKey: ', key);
		if (typeof key !== 'string') return false;
		
		// parse for versions, e.g., "trycatch@1.0.0"
		v = key.split('@');

		var latest = v[1] === 'latest' || !v[1] ? 'latest' : null;
		var version = semver.valid(v[1]);
		var range = version === null && typeof v[1] === 'string' ? semver.validRange(v[1]) : null;
		var name = v[0];

		console.log({
			name: name,
			version: version,
			range: range,
			latest: latest
		});
		if (name === '' || (!version && !latest && range === null)) {
			return false;
		}
		return {
			name: name,
			version: version,
			range: range,
			latest: latest
		};
	},
	getModule: function(name, cb) {
		console.log('getModule: ', name)
		var key = this.validateKey(name)
		if (!key) {
			cb(new Error('Invalid key passed: '+key))
		}

		step(function() {
			if (key.name.split('.')[0] === 'tiki') {
				getTikiModule(this)
			} else {
				getPublicModule(this)
			}
		}, function() {
			cb.apply(null, arguments)
		})
		// SS:
		// 1. get package
		// 2. package.dependencies = meta.deps
		// 3. later, filter on already installed

		// CS:
		// a. dependency metadata will require semver
		// b. client-side on require will need to run:
		// 		semver.maxSatisfying(Object.keys(meta[dep]), meta[name].deps[dep])
		

		function getPublicModule(next) {
			var query = util.format('%s/%s/%s',couchServer,key.name,key.version || key.latest || '')
			
			console.log('Querying URL: ',query)

			requestLib(query, function(err, res, body) {
				if (err || res.error) return cb(err || new Error(res.error));
				
				var ret = {};
				body = JSON.parse(res.body)

				console.log(query, '\n', body);
				if (body.error) return next(new Error(query + '\n' + body.reason))
				
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
					.on('end', function() {
						var deps = []
						if (body.dependencies && typeof body.dependencies === 'object') {
							for (var i in body.dependencies) {
								deps.push(i + '@' + body.dependencies[i])
							}
						}
						next(null, body.version, ret, deps);
					})
					.on('error', next);
			});
		}

		function getTikiModule(next) {
			console.log('getTikiModule')

			var ret = {}
			, filename = key.name+'.js'

			fs.readFile(__dirname + '/../src/' + filename, function(err, data) {
				if (err) return next(err)

				var deps
				, called = false
				
				function define() {
					called = true;

					if (Array.isArray(arguments[0])) {
						deps = arguments[0]
					} else if (Array.isArray(arguments[1]) && typeof arguments[1] !== 'undefined') {
						deps = arguments[1]
					}
				}

				define.amd = true

				data += '\n//@ sourceURL=' + name
				ret[name] = data

				vm.runInNewContext(data, {define: define}, filename)

				if (!called) {
					return next(new Error('Failed to load: ' + filename))
				}
				console.log('dependencies: ', deps)
				next(null, '0.0.1', ret, deps || [])
			})
		}
	},
	getModules: function(namesOrig, filter, cb) {
		console.log('getModules: ', namesOrig);
		// The filter is for modules we've already loaded
		if (typeof filter === 'function') {
			cb = filter;
			filter = [];
		}

		namesOrig = [].concat(namesOrig);

		var ret = {},
			localFilter = [].concat(filter);

		/* ret
		{
			modA: {
				v: {
					'1.0.0': {
						files: {
							'main.js': 'console.log("hello");'
						},
						deps: ['modB@0.0.9'];
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
		var i = 0;
		(function doit(names, callback) {
			var j = ++i;
			step(function() {
				if (!names.length) return this()

				var group = this.group()
				names.forEach(function(name) {

					var flag = false,
						next = group()

					var v = Module.validateKey(name);
					if (v === false) return next(new Error('Invalid module name: '+name));

					var version = v.version || v.latest || semver.maxSatisfying(localFilter, v.range);

					if (version && ret[v.name] && ret[v.name][version]) {
						if (localFilter.indexOf(v.name+'@'+version) !== -1) return next();
						if (ret[v.name][version].deps.length) {
							return doit(ret[v.name][version].deps, next);
						} else return next();
					} else {
						// mark the module as pending in the filter
						Module.getModule(name, function(err, realVersion, source, deps) {
							if (localFilter.indexOf(v.name+'@'+realVersion) !== -1) return next();
							localFilter.push(v.name+'@'+realVersion);
							ret[v.name] = {v: {}, meta: {latest: null}};

							if (err) return next(err);

							ret[v.name].v[realVersion] = {files: source, meta: { deps: deps } };
							if (version === 'latest') {
								ret[v.name].meta.latest = realVersion
							}
							if (deps.length) {
								return doit(deps, next);
							} else return next();
						})
					}
				});
			}, callback.bind(null))
		})(namesOrig, function(err) {
			cb(err, ret);
		});
	}
};

module.exports = Module;