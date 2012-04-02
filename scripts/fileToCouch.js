var fs = require('fs'),
	vm = require('vm'),
	util = require('util'),
	childProcess = require('child_process'),
	step = require('stepup'),
	request = require('request'),
	path = require('path'),
	tos = []

function onError(err) {
	console.log(err.stack);
}

(function() {
	var dir = path.join(__dirname,'..', 'js'),
		modules = path.join(dir,'modules');
	
	step(onError, function() {
		var parallel = this.parallel();
		request('http://admin:tikiftw@localhost:5984/registry/_design/app/_list/short/listAll', function(err, res) {
			console.log(res.body);
			var list = JSON.parse(res.body);
			
			if (!list.length) return parallel();

			step(function() {
				var group = this.group();

				list.forEach(function(v) {
					var next = group();
					
					request('http://admin:tikiftw@localhost:5984/registry/'+v, function(err, res2) {
						console.log('DELETING: ',v,JSON.parse(res2.body)._rev);
						request.del('http://admin:tikiftw@localhost:5984/registry/'+v+'?rev='+JSON.parse(res2.body)._rev, function(err, res, body) {
							console.log(body);
							next();
						});
					});
				});
			}, parallel);
		});
		// delete all modules from couchdb
		require('rimraf')(modules, this.parallel());
	}, function(){
		fs.mkdir(modules, this);
	}, function() {
		var group = this.group();

		['src', 'vendor'].forEach(function(folder) {
			var next = group(),
				from = path.join(dir, folder);

			fs.readdir(from, function(err, files) {
				files.forEach(function(v) {
					var orig,
						base = v.replace(/\.js$/, ''),
						to = path.join(modules,base),
						template = {
						  "author": "Adam Crabtree",
						  "name": null,
						  "shared": true,
						  "version": "0.0.1",
						}
					
					step(onError, function() {
						fs.mkdir(to, this);
					}, function(data) {
						orig = path.join(from,v);
						var dest = path.join(to,v)
						console.log('MVing: ', orig, dest);
						util.pump(fs.createReadStream(orig), fs.createWriteStream(dest), this);
					}, function() {
						var deps
							, filename = base
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


						console.log('Create package.json @ '+to);
						template.name = base;
						template.dependencies = {}

						fs.readFile(orig, function(err, data) {
							if (err) return that(err)

							console.log(base) 
							if (base !== 'index') {
								try {
									vm.runInNewContext(data, {console: console, define: define}, base+'.js')
								} catch(e) {
									console.log(base + ': ', e.message)
								}

								if (!called) {
									console.log(new Error('Failed to load: ' + filename))
								}
								console.log('dependencies: ', deps)
								;(deps || []).forEach(function(v) {
									template.dependencies[v] = '*'
								})
 							}
							fs.writeFile(path.join(to,'package.json'), JSON.stringify(template), function() {
								console.log('Publishing: ', to);
								childProcess.exec('npm publish --force ' + to, function(err, stdout, stderr) {
									console.log(stdout)
									console.log(stderr)
									next(err)
								})
							})
						})
					});
				})
			})
		});
	}, console.log.bind(console, 'COMPLETED: '));
})();