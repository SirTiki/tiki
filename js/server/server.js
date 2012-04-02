#!/usr/bin/env node

//Load some libraries
var fs = require('fs')
	, express = require('express')
	, Mu = require('mustache')
	, step = require('stepup')
	, trycatch = require('trycatch')
	, error = require('./error')
	, Module = require('./module')
	, App = require('./app')
	, Request = require('./request')
	, version = "0.0.1"
	, config = {
			port: 80
		, "public": __dirname + '/../../public'
		, development: {
				
			}
		, production: {
				maxAge: 1000 * 3600 * 24 * 365 * 10
			}
		}
	
var err = error(function(err, res) {
	if (res) {
		res.writeHead(500)
		res.end(err.stack)
	}
	console.log(err.stack)
})

var server = express.createServer(
	function (req, res, next) {
		console.log('req.url: ', req.url)
		trycatch(next, err(res))
	}
, express.bodyParser()
)

server.configure('development', function() {})
server.configure('production', function() {
	console.log = function(){}
	server.use(function (req, res, next) {
		var headers = {
			'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
		, 'Expires': 'Sat, 26 Jul 1997 05:00:00 GMT"'
		, 'Pragma': 'no-cache'
		}
		console.log('Setting Headers: ', headers)
		for (var i in headers) {
			res.setHeader(i,headers[i])
		}
		next()
	})
})

server.use(server.router);
server.use(express.static(config.public, { maxAge: config.production.maxAge }))
	
server.listen(config.port);
console.log('Listening on port: ',config.port);





// Should be placed on CDN in production
server.get('/', function (req, res) {
	console.log('ROOT');
	step(function () {
		Module.getModules(['tiki.Bootstrap', 'tiki.tiki'], this.parallel());
		fs.readFile(config.public + '/index.html', 'utf8', this.parallel());
		fs.readFile(config.public + '/js/shim.js', 'utf8', this.parallel());
		fs.readFile(config.public + '/js/bootstrap.js', 'utf8', this.parallel());
	}, err(res, function (mods, tpl, shim, bootstrap) {
		var html = Mu.to_html(tpl,{
			version: version,
			mods: JSON.stringify(mods),
			shim: JSON.stringify(shim),
			bootstrap: JSON.stringify(bootstrap)
		});

		// Turn caching on
		if (server.settings.env === 'production') {
			res.writeHead(200, {
				'Expires': 'Sun, 19 Apr 2020 11:43:00 GMT'
			, 'Cache-Control': 'public, max-age=630720000'
			, 'Last-Modified': 'Mon, 29 Jun 1998 02:28:12 GMT'
			});
		}
		res.end(html);
	}));
});

server.all('/combo?', function (req, res) {
	console.log('--------------------------------\ncombo')
	var data = req.body || req.query
		, app = App(data.appId)

	if (!app) {
		return res.end(JSON.stringify({error: 'Invalid AppId'}));
	}
//	if (!app.isAuthorized(data.origin)) {
//		return res.end(JSON.stringify({error: 'Invalid Origin'}));
//	}
	
	var request, needsId = isNaN(parseInt(data.id))
	step(function () {
		var next = this.parallel();

		if (needsId) {
			data.id = version;
			data.mods.push('tiki.main');
			console.log(data.mods);

			fs.readFile(config.public + '/js/hotBootstrap.js', 'utf8', this.parallel());
		}
		request = new Request(data);

		request.getModules(next);
	}, err(function (mods, hotBootstrap) {
		var ret = {mods: mods};
		if (hotBootstrap) {
			ret.eval = 'localStorage.bootstrap = '+JSON.stringify(hotBootstrap);
		}
		if (needsId) {
			ret.id = request.client.id;
		}
		res.json(ret);
	}));
});



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