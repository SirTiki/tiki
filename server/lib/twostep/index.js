var $$ = require('stepdown')
  , _ = require('lib/_')

$$.exec = exec
function exec(that, fnName) {
  var args = _.toArray(arguments)
    , callback = args.pop()

  if ('function' !== typeof callback) {
    throw new Error('Invalid callback for '+fnName+' on '+that)
  }

  $$([sbind.apply(null, args)], callback)
}

// Create a step that calls the function with spread
// Append step params passed
$$.sbind = sbind
function sbind(that, fnName) {
  var args
    , fn

  if ('function' === typeof that) {
    args = _.slice(arguments, 1)
    fn = that
    that = null
  } else {
    if (typeof that[fnName] !== 'function') {
      throw new Error('Invalid function: '+fnName+' on '+that)
    }

    args = _.slice(arguments, 2)
    fn = that[fnName]
  }

  return function stepified($) {
    var innerArgs = _.reject(_.slice(arguments, 1),
      function(v) {
        return 'undefined' === typeof v
      })

    innerArgs = args.concat(innerArgs, $.spread())
    fn.apply(that, innerArgs)
  }
}

// Create a step that calls the function with spread
// Ignore step params passed
$$.scall = scall
function scall(that, fnName) {
  var args
    , fn

  if ('function' === typeof that) {
    args = _.slice(arguments, 1)
    fn = that
    that = null
  } else {
    if (typeof that[fnName] !== 'function') {
      throw new Error('Invalid function: '+fnName+' on '+that)
    }

    args = _.slice(arguments, 2)
    fn = that[fnName]
  }

  return function stepCalled($) {
    fn.apply(that, args.concat([$.spread()]))
  }
}

// Create a step that returns first value
$$.value = value
function value(ret) {
  return _.partial(_.identity, ret)
}

// Create a step that returns the specified key from $.data
$$.data = data
function data(key) {
  return function($) {
    return $.data[key]
  }
}

$$.partial = partial
function partial(fn) {
  var args = _.slice(arguments, 1)

  return function($) {
    var args2 = _.sparseZip(args, _.slice(arguments, 1))
    return fn.apply(null, args2)
  }
}

// Log passed arguments and step arguments
$$.log = log
function log() {
  var outerArgs = _.toArray(arguments)
  return function($) {
    var innerArgs = _.slice(arguments, 1)
    console.log.apply(console, outerArgs.concat(innerArgs))
  }
}

module.exports = $$