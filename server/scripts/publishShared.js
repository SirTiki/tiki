#!/usr/bin/env node

var fs = require('fs')
	,	path = require('path')
	, childProcess = require('child_process')

	, npm = require('npm')
	, rimraf = require('rimraf')
	, detective = require('detective')
	,	request = require('request')

	,	_ = require('lib/_')
	,	$$ = require('lib/twostep')

	, registryUrl = 'http://admin:tikiftw@localhost:5984/registry/'
	, couchUrl = registryUrl+'/_design/scratch/_list/short/listAll'
	, sharedDir = path.join(__dirname,'..', '..', 'shared')


$$([
	function($) {
		npm.load($.none())

		$.run([
			$$.stepit(request, couchUrl)
		, function($, res) {
				var existingModules
					, group = $.group('none')

				console.log('`res.body`: ', res.body)
				existingModules = JSON.parse(res.body)

				if (!existingModules.length) return $.end()

				_.each(existingModules, function(moduleName) {
					var moduleUrl = registryUrl+moduleName

					$.run([
						$$.stepit(request, moduleUrl)
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
, $$.stepit(fs.readdir, sharedDir)
, function($, fileNames) {
		var group = $.group()

		_.each(fileNames, function(fileName) {
			var filePath = path.join(sharedDir, fileName)
			publish(filePath, group())
		})
	}
], function(err) {
	if (err) return console.log(err.stack)
	console.log('SUCCESS!')
})

function publish(modulePath, callback) {
	$$([
		$$.stepit(fs.stat, modulePath)
	, function($, stats) {
			if (stats.isDirectory()) {
				publishDirectory(modulePath, $.first())
			} else {
				if (modulePath.substr(-3) !== '.js') return
				publishModule(modulePath, $.first())
			}
		}
	], callback)
}

function publishDirectory(packageDir, callback) {
	console.log('publishDirectory: ', packageDir)
  childProcess.exec('npm publish --force ' + packageDir, callback)
}

function publishModule(modulePath, callback) {
	console.log('publishModule: ', modulePath)

	var fileName = path.basename(modulePath)
		, baseName = path.basename(fileName, '.js')
		, packageDir = path.join(sharedDir, baseName+Date.now())
		, template

	template = {
		author: "Adam Crabtree"
  , name: baseName.toLowerCase()
  , version: "0.0.1"
  , dependencies: {}
  }

	$$([
		$$.stepit(fs, 'mkdir', packageDir)
	, function($) {
			var dest = path.join(packageDir, fileName)

			fs.createReadStream(modulePath)
				.pipe(fs.createWriteStream(dest))
				.on('close', $.none())

			$.run([
				$$.stepit(fs, 'readFile', modulePath)
			, function($, src) {
					var dependencies = detective(src)

					_.each(dependencies, function(dependency) {
						template.dependencies[dependency] = '*'
					})
					fs.writeFile(path.join(packageDir,'package.json'), JSON.stringify(template), $.first())
				}
			], $.none())
		}
	, function($) {
			console.log('Publishing: ', packageDir)
      childProcess.exec('npm publish --force ' + packageDir, $.none())
		}
	, $$.log('removing: ', packageDir)
	], function(err) {
		rimraf(packageDir, function(innerErr) {
			callback(err || innerErr)
		})
	})
}