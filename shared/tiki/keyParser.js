module.exports = {
	parse: parse
, format: format
}


function parse(key) {
	var re = /([^@\/]+)(@[^\/]+)?(\/.+)?/g
		, name
		, version
		, path
		, matches

	if (typeof key !== 'string') return null

	// parse for versions, e.g., "trycatch@1.0.0/a/b/c"
	matches = re.exec(key)

	name = matches[1]
	matches[2] = matches[2] && matches[2].substr(1)
	version = matches[2] || ''
	path = matches[3] || ''

	return {
		name: name
	, version: version
	, path: path
	, pkg: name + (version ? '@' + version : '')
	, module: name + path
	, full: name + (version ? '@' + version : '') + path
	}
}

function format(keyObj) {
	var split

	if (keyObj.module && keyObj.version) {
		split = keyObj.module.split('/')
		return split.shift() + '@' + keyObj.version + '/' + split.join('/')
	}

	return keyObj.name + (keyObj.version ? '@' + keyObj.version : '') + (keyObj.path || '')
}