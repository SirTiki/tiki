var util = require('util')

  , _ = require('lodash')._
  , trycatch = require('trycatch')
  , _s = require('underscore.string')

  , trav = require('./traverse')

  , push = Array.prototype.push

_.mixin(_s.exports())

_.nop = nop
function nop(){}

_.slice = slice
function slice(a, b) {
  return Array.prototype.slice.call(a, b)
}

_.concat = concat
function concat(a, b) {
  var c = _.slice(a, 0)
  push.apply(c, b)
  return c
}

_.isSimpleObject = isSimpleObject
function isSimpleObject(obj){
  return "[object Object]" === Object.prototype.toString.call(obj)
}

// https://github.com/mcandre/node-zipwith/blob/master/zipwith.js
_.zipWith = zipWith
function zipWith(f) {
	var args = _.zip.apply(null, Array.prototype.slice.call(arguments, 1));
	return args.map(function (arg) { return f.apply(null, arg); });
}

_.sparseZip = sparseZip
function sparseZip() {
  var args = _.toArray(arguments).reverse()

  return _.reduce(args, function(prev, curr) {
    var i = -1

    // Don't augment original array
    curr = [].concat(curr)
    _.each(curr, function(v, k) {
      if ('undefined' === typeof v) {
        curr[k] = prev[++i]
      }
    })

    return curr.concat(_.slice(prev, ++i))
  }, [])
}

_.partial = partial
function partial(fn) {
  var args = _.slice(arguments, 1)

  if ('function' !== typeof fn) {
    throw new Error('fn is not a function: '+fn)
  }

  return function(){
    var args2 = _.sparseZip(args, _.toArray(arguments))
    return fn.apply(this, args2)
  }
}

_.partialize = partialize
function partialize(fn, paramCount, that) {
  paramCount = Number(paramCount) || 0

  return function() {
    var args = _.toArray(arguments)
    function _partialize() {
      args = _.sparseZip(args, _.toArray(arguments))
      if (args.length >= paramCount) {
        return fn.apply(that, args)
      }
      return _partialize
    }
    return _partialize()
  }
}

_.ensureCb = ensureCb
function ensureCb(cb) {
  if (_.isFunction(cb)) {
    return function(err) { cb.apply(this, arguments) }
  }
  return function(err) {if (err) throw err}
}

// Argument enforcement
// Call fn on passing validation, call callback w/error otherwise.
// Ex: _.required(fn, ['foo', 'number'], ['bar', Number], ['baz', null], ['bim', true])(1, 2, undefined, 3)
_.required = required
function required(fn) {
  var args = _.toArray(arguments)
  fn = args.shift()

  return function() {
    var args2 = _.toArray(arguments)
      , msg
      , callback

    if (typeof args2[args2.length-1] === 'function') {
      callback = args2.pop()
    }

    _.find(args, function(validator, k) {
      var v = args2[k]
        , msg
        , name

      if (Array.isArray(validator)) {
        name = validator[0]
        validator = validator[1]
      }

      if (typeof validator === 'function') {
        switch(validator) {
          case Number:
            validator = 'number'
          break
          case String:
            validator = 'string'
          break
          case Boolean:
            validator = 'boolean'
          break
          default:
            if (!(v instanceof validator)) {
              msg = util.format('%s must be of instanceof %s', name || 'arguments['+k+']', validator.name)
            } else return
        }
      }
      if (typeof validator === 'string') {
        if (typeof v !== validator) {
          msg = util.format('%s must be of type %s', name || 'arguments['+k+']', validator.toString())
        } else return
      } else if (validator === true) {
        if (v == null) {
          msg = util.format('%s is required', name || 'arguments['+k+']')
        } else return
      }
      return true
    })

    if (callback) {
      if (msg) {
        return callback(new Error(msg))
      } else {
        args2.push(callback)
      }
    }
    return fn.apply(this, args2)
  }
}

_.deepInvoke = deepInvoke
function deepInvoke(obj, method) {
  var args = _.toArray(arguments).slice(2)
    , path = typeof method === 'string' ? method.split('.') : []

  method = path.pop()

  return _.map(obj, function(value) {
    if (path.length) {
      value = trav(value).get(path)
    }
    return (_.isFunction(method) ? method : value[method]).apply(value, args)
  })
}

_.deepPluck = deepPluck
function deepPluck(obj, path) {
  if (typeof path !== 'string' && !Array.isArray(path)) return []

  if (typeof path === 'string') {
    path = path.split('.')
  }

  return _.map(obj, function(value) {
      return trav(value).get(path)
  })
}

_.deepResult = deepResult
function deepResult(obj, path) {
  if ('string' === typeof path) {
    path = path.split('.')
  }

  return _.trav(obj).get(path)
}

// Fast bind for the 98% of the time when .call & .apply are overkill
_.fbind = fastBind
function fastBind(that, name) {
  if (typeof that[name] !== 'function') return _.nop

  return function(arg1, arg2, arg3, arg4, arg5, arg6) {
    return that[name](arg1, arg2, arg3, arg4, arg5, arg6)
  }
}

_.objectMap = objectMap
function objectMap(arr, key) {
  var ret = {}
    , i
    , l
    , n

  if (!Array.isArray(arr)) return ret

  for(i=0, l=arr.length; i<l; i++) {
    if (typeof arr[i] === 'object') {
      n = arr[i]
      ret[n[key]] = n
    }
  }

  return ret
}

_.order = order
function order(ids, objs, name) {
  var idMap = _.invert(ids)

  _.each(objs, function(obj) {
    ids[idMap[obj[name]]] = obj
  })
  return ids
}

// Create a duplicate of all objects to any zero-indexed depth.
_.deepClone = deepClone
function deepClone(obj, depth) {
  var key, clone
  if (!obj || (typeof obj !== 'object')) return obj  // by value
  else if (_.isString(obj)) return String.prototype.slice.call(obj)
  else if (_.isDate(obj)) return new Date(obj.valueOf())
  else if (_.isFunction(obj.clone)) return obj.clone()
  if (_.isArray(obj)) clone = Array.prototype.slice.call(obj)
  else if (obj.constructor!=={}.constructor) return obj // by reference
  else clone = _.extend({}, obj)
  if (!_.isUndefined(depth) && (depth > 0)) {
    for (key in clone) {
      clone[key] = _.deepClone(clone[key], depth-1)
    }
  }
  return clone
}

_.asyncify = asyncify
function asyncify(fn) {
  return function() {
    var args = _.toArray(arguments)
      , callback = args.pop()
      , ret
      , err

    if ('function' !== typeof callback) {
      args.push(callback)
      callback = _.nop
    }

    try{
      ret = fn.apply(this, arguments)
    } catch(e) {
      err = e
    }

    callback(err, ret)
  }
}

_.popCallback = popCallback
function popCallback(args) {
  var callback

  if ('function' === typeof args[args.length-1]) {
    callback = Array.prototype.pop.call(args)
  }
  return callback
}

_.nextTick = nextTick
function nextTick(callback) {
  if ('function' !== typeof callback) {
    return
  }

  var args = _.toArray(arguments).slice(1)
  process.nextTick(function() {
    callback.apply(null, args)
  })
}

// Map the options object fields to arguments in legacy fn
// Assume argument before callback is an options object
// Ex: doa.queryByFoo(foo, opts, callback) => (foo, skip, limit, callback)
_.mapOpts = mapOpts
function mapOpts(fn, list) {
  return function() {
    var args = _.toArray(arguments)
      , l = args.length
      , opts = args[l-2]
      , argList

    if (_.isSimpleObject(opts)) {
      argList = _.map(list, function(argName) {
        return opts[argName]
      })
      args.splice.apply(args, [l-2, 1].concat(argList))
    }
    return fn.apply(this, args)
  }

}

// dbind is function.bind for dcall (domains)
_.dbind = dbind
function dbind(that, fnName) {
  var args = _.toArray(arguments)
    , callback = args[args.length-1]
    , fn

  args.unshift(_.dcall)
  return _.partial.apply(_, args)
}

// dcall invokes the function wrapped in a trycatch (domain)
_.dcall = dcall
function dcall(that, fnName) {
  var args = _.toArray(arguments)
    , callback = args[args.length-1]
    , fn

  if ('function' === typeof that) {
    fn = that
    that = null
    args = args.slice(1)
  } else {
    fn = that[fnName]
    args = args.slice(2)
  }

  if ('function' !== typeof callback) {
    throw new Error('Invalid callback for '+fnName+' on '+that)
  }

  trycatch(function() {
    fn.apply(that, args)
  }, callback)
}

_.logit = logit
function logit() {
  var args = logit.caller.arguments
    , name = args.callee.name || '<Anonymous>'
    , originArgs = util.inspect(args, false, 5, true)
    , passedArgs = arguments.length ? '\nPASSED::\n'+util.inspect(arguments, false, 5, true) : ''

  console.log(util.format('<<<<<<<<<<<< %s: %s\narguments:\n%s%s\n============', name, passedArgs, originArgs))
}

_.logitWrap = logitWrap
function logitWrap(fn) {
  var args = _.slice(arguments, 1)
    , name = fn.name || '<Anonymous>'
    , passedArgs = args.length ? util.inspect(args, false, 5, true) : ''

  console.log(util.format('>>>>>>>>>>>>: %s: \n%s\n============', name, passedArgs))

  return function() {
    _.logit.apply(null, args)
    return fn.apply(this, arguments)
  }
}

_.throwError = throwError
function throwError(Err) {
  return function(msg) {
    if (msg instanceof Error) {
      throw msg
    }
    if (typeof msg === 'string') {
      msg = util.format.apply(util, arguments)
    }
    throw new Err(msg)
  }
}

_.createSubError = createSubError
function createSubError(Ctor, prototype, SuperCtor) {
  var check = false

  if (typeof Ctor !== 'function') {
    SuperCtor = prototype
    prototype = Ctor
    Ctor = function(){}
  }

  if ('function' !== typeof prototype) {
    prototype = _.isSimpleObject(prototype) ? prototype : {}
    // No better way to do this, only on creation
  } else {
    SuperCtor = prototype
    prototype = {}
  }

  if ('function' === typeof SuperCtor) {
    // No better way to do this
    if (!((new SuperCtor) instanceof Error)) {
      SuperCtor = createSubError(SuperCtor)
    }
  } else {
    SuperCtor = Error
  }

  function SubError(message) {
    var err = new SuperCtor(message)
    err.__proto__ = this.__proto__
    Ctor.apply(err, arguments)
    return err
  }

  SubError.super_ = SuperCtor
  prototype.__proto__ = SuperCtor.prototype
  SubError.prototype = prototype
  return SubError
}

_.guard = guard
function guard(callback) {
  return function(fn) {
    fn = typeof fn !== 'function' ? _.nop : fn

    return function(err, one, two, three) {
      var ret
      if (err) {
        callback(err)
        return
      }
      ret = fn(one, two, three)
      if ('undefined' !== typeof ret) {
        callback(null, ret)
      }
    }
  }
}

_.validate = (function() {
  var ValidationError
    , throwValidationError
    , validate

  function Optional(type) {
    if (!(this instanceof Optional)) {
      return new Optional(type)
    }

    this.type = type
  }

  ValidationError = _.createSubError({
    name: 'ValidationError'
  })
  throwValidationError = _.throwError(ValidationError)

  validate = _.partialize(function validate(schema) {
    var args = _.slice(arguments, 1)
      , obj

    args.unshift({})
    obj = _.deepClone(_.defaults.apply(_, args), 10)

    return _validate(schema, obj, 'root')
  }, 1)


  function _validate(schema, obj, key) {
    // Rule #0: If the schema is undefined, anything goes.
    if (undefined === schema) {
      return obj
    }

    // Rule #1: If the schema is null, we expect obj to not exist.
    if (null === schema) {
      if (obj != null) {
        throwValidationError('Expected %s to not exist, but found', key, obj)
      }
      return obj
    }

    // Rule #2: If the schema is an Array, we expect obj to be an Array of valid elements.
    if (Array.isArray(schema)) {
      if (!(obj instanceof Array)) {
        throwValidationError('Expected %s to be an Array, but found', key, obj)
      }

      return obj.map(function (item, index) {
        var ret = _validate(schema[0], item, key + '[index]')
        return obj[index] = ret
      })
    }

    // Rule #3: If the schema is a Function, we expect obj to be an instance of that type.
    if ('function' === typeof schema) {
      if ('function' === typeof obj) {
        obj = obj()
      }

      if ('object' === typeof obj) {
        if (!(obj instanceof schema)) {
          throwValidationError('Expected %s to be an instance of %s, but found', key, schema.name || schema, obj)
        }
        return obj
      } else {
        if ('undefined' === typeof obj || obj.constructor !== schema) {
          throwValidationError('Expected %s to be an instance of %s, but found', key, schema.name || schema, obj)
        }
        return obj
      }
    }

    // default, type, required, enum, coerce
    if (_.isSimpleObject(schema) && schema.type && 'undefined' === typeof schema.type.type) {
      if ('undefined' !== typeof schema.default && 'undefined' === typeof obj) {
        if ('function' === typeof schema.default && 'function' !== schema.type) {
          obj = schema.default()
        } else {
          obj = _.clone(schema.default)
        }
      }
      if (Array.isArray(schema.enum) && !_.contains(schema.enum, obj)) {
        throwValidationError('Expected %s to be one of [%s], but found %s', key, schema.enum, obj)
      }
      if ('undefined' === typeof obj) {
        if (true === schema.required) {
          throwValidationError('Expected %s to exist', key)
        } else {
         return obj
        }
      }

      return _validate(schema.type, obj, key)
    }

    // Rule #4: We expect Non-Array, Non-Function types to match
    if (typeof obj !== typeof schema) {
      throwValidationError('Expected %s to be of type "%s", but found', key, typeof schema, obj)
    }

    // Rule #5: We expect Non-Array, Non-Function, Non-Object values to match
    if (typeof schema !== 'object') {
      if (obj === schema) {
        throwValidationError('Expected %s to equal %s, but found ', key, schema, obj)
      }
      return obj
    }

    // Rule #6: If schema is an object, we expect obj to match schema recursively.
    // (but first, let's be sure obj HAS keys...)
    if (!obj) {
      throwValidationError('Expected %s to be an Object, but found', key, obj)
    }

    _.each(schema, function (item, subkey) {
      var isOptional = schema[subkey] instanceof Optional
        , ret

      if (isOptional && obj[subkey] == null) {
        return
      }

      if ('undefined' === typeof obj[subkey] && !_.isObject(schema[subkey])) {
        throwValidationError('Expected %s to have a property named "%s"', key, subkey)
      }

      ret = _validate(isOptional ? schema[subkey].type : schema[subkey], obj[subkey], key + '.' + subkey)
      obj[subkey] = ret
    })
    return obj
  }

  validate.Optional = Optional
  validate.ValidationError = ValidationError
  return validate
})()

_.mixin({
  objectMap: objectMap
})
_.trav = trav
module.exports._ = _
