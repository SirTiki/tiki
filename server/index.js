#!/usr/bin/env node

//Load some libraries
var fs = require('fs')
	, express = require('express')

	, Mu = require('mustache')

	, $$ = require('lib/twostep')
	, _ = require('lib/_')
	, Module = require('lib/module')
	, App = require('lib/app')
	, Request = require('lib/request')

	, version = "0.0.1"
	, config
	, server

config = {
	port: 80
, "public": __dirname + '/../public'
, development: {}
, production: {
		maxAge: 1000 * 3600 * 24 * 365 * 10
	}
}

function errorHandler(err, res) {
	if (!err) return

	if (res) {
		res.writeHead(500)
		res.end(err.stack)
	}
	console.log(err.stack)
}

server = express.createServer(
	express.bodyParser()
)

server.configure('development', function() {})
server.configure('production', function() {
	console.log = function(){}
	server.use(function (req, res, next) {
		var headers
			, i

		headers = {
			'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
		, 'Expires': 'Sat, 26 Jul 1997 05:00:00 GMT"'
		, 'Pragma': 'no-cache'
		}

		console.log('Setting Headers: ', headers)
		for (i in headers) {
			res.setHeader(i,headers[i])
		}
		next()
	})
})

server.use(server.router)
server.use(express.static(config.public, { maxAge: config.production.maxAge }))

server.listen(config.port)
console.log('Listening on port: ',config.port)



// Should be placed on CDN in production
server.get('/', function (req, res) {
	console.log('ROOT')
	$$([
		function ($) {
			Module.getModules(['tiki/Bootstrap', 'tiki/tiki'], $.first())
			fs.readFile(config.public + '/index.html', 'utf8', $.first())
			fs.readFile(config.public + '/js/shim.js', 'utf8', $.first())
			fs.readFile(config.public + '/js/bootstrap.js', 'utf8', $.first())
		},
		function ($, pkgs, tpl, shim, bootstrap) {
			var html

			html = Mu.to_html(tpl,{
				version: version,
				pkgs: JSON.stringify(pkgs),
				shim: JSON.stringify(shim),
				bootstrap: JSON.stringify(bootstrap)
			})

			// Turn caching on
			if (server.settings.env === 'production') {
				res.writeHead(200, {
					'Expires': 'Sun, 19 Apr 2020 11:43:00 GMT'
				, 'Cache-Control': 'public, max-age=630720000'
				, 'Last-Modified': 'Mon, 29 Jun 1998 02:28:12 GMT'
				})
			}
			res.end(html)
		}
	], _.partial(errorHandler, undefined, res))
})

server.all('/combo?', function (req, res) {
	var data = req.body || req.query
		, app = App(data.appId)
		, request
		, needsId

	if (!app) {
		return res.end(JSON.stringify({error: 'Invalid AppId'}))
	}
//	if (!app.isAuthorized(data.origin)) {
//		return res.end(JSON.stringify({error: 'Invalid Origin'}))
//	}

	needsId = isNaN(parseInt(data.id, 10))

	$$([
		function ($) {
			if (needsId) {
				data.id = version
				data.pkgs.push('tiki/main')
				console.log(data.pkgs)
			}

			request = new Request(data)
			request.getModules($.first())

			if (needsId) {
				fs.readFile(config.public + '/js/hotBootstrap.js', 'utf8', $.first())
			}
		}
	, function ($, pkgs, hotBootstrap) {
			var ret = {pkgs: pkgs}

			if (hotBootstrap) {
				ret.eval = 'localStorage.bootstrap = '+JSON.stringify(hotBootstrap)
			}
			if (needsId) {
				ret.id = request.client.id
			}
			res.json(ret)
		}
	], _.partial(errorHandler, undefined, res))
})



/*


Currently:
- Handle dep range (semver) in getDependencies
	- Either pass ranges and handle outside
	- or inside
- Handle weirdness with package.json, deps, etc...
- Build default logic around "main", "index", "script"
- Handle versioning

TODO:

0. Tie tempId to id
1. Go live *.com
2. npm install
3. appid
4. domain validation
5. httpsib
6. minimize
7. Cyclic dependencies
8. Stream response

Notes:
https://github.com/LearnBoost/cluster?
- How do we prevent global namespace clutter?
	=> allow domain module association => allow non-iframe loading (CORS)
	=> CORS to circumvent iframe?

*/