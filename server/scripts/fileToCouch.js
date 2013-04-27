var fs = require('fs')
,	vm = require('vm')
,	childProcess = require('child_process')
,	util = require('util')
,	path = require('path')

,	request = require('request')
, rimraf = require('rimraf')

,	_ = require('lib/_')
,	$$ = require('lib/twostep')

, registryUrl = 'http://admin:tikiftw@localhost:5984/registry/'
, couchUrl = registryUrl+'/_design/app/_list/short/listAll'
, jsDir = path.join(__dirname,'..', 'js')
, modulesDir = path.join(jsDir,'modules')


$$([
	function($) {
		// delete all modules from couchdb
		rimraf(modulesDir, $.none())

		$.run([
			$$.scall(request, couchUrl)
		, function($, res) {
				var list
					, group = $.group('none')

				console.log('`res.body`: ', res.body)
				list = JSON.parse(res.body)

				if (!list.length) return $.end()

				_.each(list, function(moduleName) {
					var moduleUrl = registryUrl+moduleName

					$.run([
						$$.scall(request, url)
					, function($, res2) {
							var body = JSON.parse(res2.body)
								, revision = body._rev
								, revisionUrl = moduleUrl+'?rev='+revision

							console.log('DELETING: ', moduleName, revision)
							request.del(revisionUrl, $.none())
						}
					], group())
				})
			}
		], $.none())
	}
, $$.scall(fs, 'mkdir', modulesDir)
, function($) {
		var group = $.group()

		_.each(['src', 'vendor'], function(folder) {
			var parentDir = path.join(jsDir, folder)

			$.run([
				$$.scall(fs, 'readdir', parentDir)
			, function($, fileNames) {
					var innerGroup = $.group()

					_.each(fileNames, function(fileName) {
						var filePath = path.join(parentDir, fileName)
						convertModuleToPackage(filePath, innerGroup())
					})
				}
			], group())
		})
	}
], function(err) {
	if (err) return console.log(err.stack)
	console.log('SUCCESS!')
})


/*
	1. Make package directory
	2. Move file
	3. Execute files, get dependencies
	4. Build package.json from dependencies
	5. Publish package
 */
function convertModuleToPackage(modulePath, callback) {
	var parentDir = path.dirname(modulePath)
		, fileName = path.basename(modulePath)
		, baseName = path.basename(fileName, 'js')
		, packageDir = path.join(modulesDir, baseName)
		, template

	template = {
		"author": "Adam Crabtree"
  , "name": null
  , "shared": true
  , "version": "0.0.1"
  }

	$$([
		$$.scall(fs, 'mkdir', packageDir)
	, function($) {
			var dest

			dest = path.join(packageDir, fileName)
			console.log('MVing: ', modulePath, dest)

			fs.createReadStream(modulePath)
				.pipe(fs.createWriteStream(dest))
				.on('end', $.none())

			$.run([
				$$.scall(fs, 'readFile', modulePath)
			, function(data) {
					var called = false
						, deps

					function define() {
						called = true

						if (Array.isArray(arguments[0])) {
							deps = arguments[0]
						} else if (Array.isArray(arguments[1]) && typeof arguments[1] !== 'undefined') {
							deps = arguments[1]
						}
					}
					define.amd = true

					console.log('Create package.json @ '+packageDir)
					template.name = baseName
					template.dependencies = {}

					if (baseName !== 'index') {
						try {
							vm.runInNewContext(data, {console: console, define: define}, fileName)
						} catch(e) {
							console.log(baseName + ': ', e.message)
						}

						if (!called) {
							console.log(new Error('Failed to load: ' + filename))
						}

						console.log('dependencies: ', deps)
						_.each(deps, function(depName) {
							template.dependencies[depName] = '*'
						})
					}
					fs.writeFile(path.join(packageDir,'package.json'), JSON.stringify(template), $.first())
				}
			], $.none())
		}
	, function($) {
			console.log('Publishing: ', packageDir)
			childProcess.exec('npm publish --force ' + packageDir, $.spread())
		}
	, $$.log()
	], callback)
}