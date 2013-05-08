var $$ = require('stepdown')
  , _ = require('lib/_')._

$$.exec = exec
function exec(that, fnName) {
  var args = _.toArray(arguments)
    , callback = args.pop()

  if ('function' !== typeof callback) {
    throw new Error('Invalid callback for '+fnName+' on '+that)
  }

  $$([partial.apply(null, args)], callback)
}


$$.partialValue = partialValue
function partialValue(that, fnName) {
  var outerArgs
    , fn

  if ('function' === typeof that) {
    outerArgs = _.slice(arguments, 1)
    fn = that
    that = null
  } else {
    if (typeof that[fnName] !== 'function') {
      throw new Error('Invalid function: '+fnName+' on '+that)
    }

    outerArgs = _.slice(arguments, 2)
    fn = that[fnName]
  }

  return function stepified() {
    var innerArgs = _.slice(arguments, 1)
      , args

    args = _.sparseZip(outerArgs, innerArgs)
    return fn.apply(that, args)
  }
}

// Create a step that calls the function with spread
// Append step params passed
$$.partial = partial
function partial(that, fnName) {
  var outerArgs
    , fn

  if ('function' === typeof that) {
    outerArgs = _.slice(arguments, 1)
    fn = that
    that = null
  } else {
    if (typeof that[fnName] !== 'function') {
      throw new Error('Invalid function: '+fnName+' on '+that)
    }

    outerArgs = _.slice(arguments, 2)
    fn = that[fnName]
  }

  return function stepified($) {
    var innerArgs = _.slice(arguments, 1)
      , args

    args = _.sparseZip(outerArgs, innerArgs)
    args.push($.spread())
    fn.apply(that, args)
  }
}

// Create a step that calls the function with spread
// Ignore step params passed
$$.stepit = stepit
function stepit(that, fnName) {
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

// Log passed arguments and step arguments
$$.log = log
function log() {
  var outerArgs = _.toArray(arguments)
  return function() {
    var innerArgs = _.slice(arguments, 1)
    console.log.apply(console, outerArgs.concat(innerArgs))
  }
}

module.exports = $$