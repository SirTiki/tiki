//Usage: var lib = require('lib')('mymodule', 'mymodule2', ...);

var basename = require('path').basename,
    natives = process.binding('natives');

function lazy_require (obj, name, module) {
    module = module || name;
    Object.defineProperty(obj, name, {
        enumerable: true,
        configurable: true,
        get: function() {
            delete obj[name];
            return obj[name] = require(module);
        }
    });
}

module.exports = function (/* modules */) {
    var args, lib = {}, i, l;
    for (i in natives) lazy_require(lib, i);
    args = Array.isArray(arguments[0]) 
         ? arguments[0]
         : Array.prototype.slice.call(arguments);
    require.paths.unshift('.'); //For convenience.
    for (i = 0, l = args.length; i < l; i++) {
        lazy_require(lib, basename(args[i]), args[i]);
    }
    return lib;
};