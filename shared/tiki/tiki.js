console.debug('tiki/tiki ctor')

var define = require('tiki/define')
  , globalEval = require('tiki/globalEval')
  , getDependencies = require('tiki/getDependencies')
  , semver = require('tiki/semver')
  , keyParser = require('tiki/keyParser')
  , callbacks = []
  , queue

window.require = define.require
window.define = define.define

define = define.define

module.exports = tiki
function tiki(paths, cb) {
  console.debug('tiki(): ',paths)
  var localPaths = []
    , remotePaths = []
    // , bailout = []
    , key
    , n, i, l, v

  cb.paths = paths = [].concat(paths)
  for (i=0,l=paths.length; i<l; ++i) {
    key = keyParser.parse(paths[i])
    if (!key || typeof define.defined[key.full] !== 'undefined') continue

    console.log('key: ', key.full, Store.listVersions(key.module))
    v = semver.maxSatisfying(Store.listVersions(key.module) || [],key.version)
    if (v) {
      key.version = v
      key = keyParser.parse(keyParser.format(key))
      console.debug('Queue (localStorage): ', key.full)
      localPaths.push(key.full)
    } else {
      console.debug('Queue (remote): ', key.full)
      remotePaths.push(key.full)
    }
  }

  remotePaths.concat(load(localPaths))

  if (remotePaths.length && !tiki.window) {
    tiki.q.push(arguments)
    return
  }

  if (remotePaths.length) {
    tiki.getRemotes(remotePaths, function next(remotes) {
      console.debug('tiki().getRemotes cb', remotes)

      for(i=0,l=remotePaths.length; i<l; ++i) {
        key = keyParser.parse(remotePaths[i])

        key.version = semver.maxSatisfying(Object.keys(remotes[key.name].v) || [], key.version)
        remotePaths[i] = keyParser.format(key)
      }

      console.log('before: ', remotePaths)
      var missing = load(remotePaths)
      console.log('after: ', missing)
      if (missing.length) {
        throw new Error('Missing Dependencies: '+missing)
      }

      console.log('remotePaths: ', remotePaths)

      cb(define.require, define.define)
    })
  } else cb(define.require, define.define)

  function load(paths) {
    var ret = []
      , version
      , module
      , deps
      , key

    deps = getDependencies(paths, function(path) {
      var key = keyParser.parse(path)
        , ret
        , v

      v = semver.maxSatisfying(Object.keys(define.defined[key.module] || {}), key.version)
      key.version = v || key.version
      key = keyParser.parse(keyParser.format(key))
      ret = Store.getModMeta(key.full)
      console.log('Dependencies for ', path, ret)
      return (ret && ret.deps) || []
    }).concat(paths)

    console.log('deps: ', paths, deps)
    for (i=0; n=deps[i]; ++i) {
      key = keyParser.parse(n)

      version = semver.maxSatisfying(Store.listVersions(key.module) || [], key.version)

      console.log('version: ', version)
      if (version) {
        key.version = version
        key = keyParser.parse(keyParser.format(key))
      console.log('key: ', key)
        module = Store.getMod(key.full)
      console.log('module: ', module)
        if (module === null) {
          ret.push(key.full)
          continue
        }
        console.debug('UPDATE THIS EVAL WITH VERSIONING, RELATIVE PATH: ', module)
        define.version = version
      console.log('module.src: ', module.src)
        globalEval(module.src)
      }
    }
    return ret
  }
}

tiki.getRemotes = function(paths, cb) {
  console.debug('tiki(), loading from remotes, "'+paths+'"')
  var id = callbacks.push(cb) - 1
  console.debug('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
  tiki.window.postMessage(JSON.stringify({appId: tiki.appId, id: id, paths: paths}),'*')
}

tiki.ready = function(e,listener)  {
  console.debug('tiki.ready()')

  var i, n

  queue = queue || window.tiki.q || []
  window.tiki = tiki
  window.removeEventListener('message', listener || tiki.ready)
  window.addEventListener('message', tiki.onMessage)
  window.win = tiki.window = (e && e.source) || document.querySelector('iframe[data-tikiid]').contentWindow
  tiki.window.postMessage('bootstrap','*')
  tiki.appId = document.querySelector('iframe[data-tikiid]').getAttribute('data-tikiid')

  for (i=0; n=queue[i]; ++i) {
    console.debug('Dequeue::'+i,n)
    tiki.apply(null,n)
  }
}

tiki.onMessage = function(e){
  var key
    , meta
    , m
    , i, j, k

  try {
    m = JSON.parse(e.data)
    console.debug('tiki().onMessage: ', m)
  } catch(err) {
    localStorage['tiki'] = e.data
    console.debug('tiki().onMessage (boostrap): ', {src: e.data})
  }
  if (Object.prototype.toString.call(m) == '[object Object]') {
    for(i in m.data) {
      for (j in m.data[i].v) {
        key = i + '@' + j
        console.debug('Checking defined: ', key)
        if (typeof define.defined[key] == 'undefined') {
          console.debug('Eval\'ing: ', key)
          console.debug('UPDATE THIS EVAL WITH VERSIONING, RELATIVE PATH: ', m.data[i].v[j])
          define.version = j
          console.log('here: ', i, j, m.data)
          meta = m.data[i].v[j].meta || {}
          Store.setMeta(i, j, {v: meta})
          for (k in m.data[i].v[j].mods) {
            globalEval(m.data[i].v[j].mods[k].src)
            Store.setMod(k, j, m.data[i].v[j].mods[k])
          }
        }
      }
    }

    callbacks[m.id](m.data)
    callbacks[m.id] = null
  }
}

var Store = {
    pkgs: {},
    metas: {},
    getMod: function(fullName) {
      var parsedKey = keyParser.parse(fullName)
        , key
        , mod

      if (!parsedKey.version && this.metas[parsedKey.name].latest) {
        parsedKey.version = this.metas[parsedKey.name].latest
        parsedKey = keyParser.parse(keyParser.format(parsedKey))
      }

      console.log('here: ', this.pkgs, parsedKey)
      if (!this.metas[parsedKey.full]) {
        console.log('not cached. load from localStorage')
        if ('tiki$' + parsedKey.module in localStorage) {
          try {
            this.metas[parsedKey.full] = JSON.parse(localStorage['tiki$' + parsedKey.module])
          } catch(e) {
            console.debug('Corrupted metadata (' + parsedKey.module + '): ', localStorage['tiki$' + parsedKey.module])

            // if metadata's corrupted, purge references to module from localStorage
            this.remove(parsedKey.module)
          }
        } else console.warn('tiki$' + parsedKey.module + ' NOT FOUND IN localStorage')

      }

      this.pkgs[parsedKey.name] = this.pkgs[parsedKey.name] || {v: {}, meta: this.metas[parsedKey.name]}
      console.log('meta: ', this.metas[parsedKey.full])
      if (!this.metas[parsedKey.full]) {
        return null
      }

      key = 'tiki_' + parsedKey.full

      if (!this.pkgs[parsedKey.name] || !this.pkgs[parsedKey.name].v[parsedKey.version] || !this.pkgs[parsedKey.name].v[parsedKey.version].mods[parsedKey.module]) {
        if (key in localStorage) {
          try {
            mod = JSON.parse(localStorage[key])
          } catch(e) {
            delete localStorage[key]
            this.setMeta(parsedKey.full, null)
          }

          this.pkgs[parsedKey.name].v[parsedKey.version] = this.pkgs[parsedKey.name].v[parsedKey.version] || {mods: {}, meta: this.metas[parsedKey.name] && this.metas[parsedKey.name].v[parsedKey.version]}
          this.pkgs[parsedKey.name].v[parsedKey.version].mods[parsedKey.module] = {src: mod, meta: this.metas[parsedKey.full]}
        }
      }

      return this.pkgs[parsedKey.name].v[parsedKey.version].mods[parsedKey.module] || null
    },
    setMod: function(name, version, mod) {
      var parsedKey = keyParser.parse(keyParser.format({module: name, version: version}))

      if (typeof parsedKey.name !== 'string' || typeof parsedKey.version !== 'string' || typeof parsedKey.path !== 'string' || typeof mod !== 'object') {
        throw new Error('Invalid params: ' + JSON.stringify(arguments))
      }

      this.pkgs[parsedKey.name] = this.pkgs[parsedKey.name] || {v: {}, meta: this.metas[parsedKey.name] || {}}
      this.pkgs[parsedKey.name].v[parsedKey.version] = this.pkgs[parsedKey.name].v[parsedKey.version] || {mods: {}}
      this.pkgs[parsedKey.name].v[parsedKey.version].mods[parsedKey.module] = mod

      this.metas[parsedKey.name] = this.metas[parsedKey.name] || {latest: parsedKey.version, v: {}, meta: {}}
      if (!this.metas[parsedKey.name].latest || parsedKey.version > this.metas[parsedKey.name].latest) {
        this.metas[parsedKey.name].latest = parsedKey.version
      }

      localStorage['tiki_' + parsedKey.full] = JSON.stringify(mod.src)
      localStorage['tiki$' + parsedKey.module] = JSON.stringify(mod.meta)
    },
    getModMeta: function(fullName) {
      var parsedKey = keyParser.parse(fullName)

      if (!this.metas[parsedKey.full]) {
        if ('tiki$' + parsedKey.module in localStorage) {
          try {
            this.metas[parsedKey.full] = JSON.parse(localStorage['tiki$' + parsedKey.module])
          } catch(e) {
            this.remove(parsedKey.full)
          }
        } else {
          return null
        }
      }

      return this.metas[parsedKey.full] || null
    },
    getPkgMeta: function(name, version) {
      name = keyParser.parse(name).name

      if (!this.metas[name]) {
        if ('tiki$' + name in localStorage) {
          try {
            console.log('loading from localStorage')
            this.metas[name] = JSON.parse(localStorage['tiki$' + name])
          } catch(e) {
            this.remove(name)
            return null
          }
        } else {
          return null
        }
      }

      version = version || this.metas[name].latest
      return this.metas[name] && this.metas[name].v[version] || null
    },
    setModMeta: function(name, version, meta) {
      var parsedKey = keyParser.parse(keyParser.format({module: name, version: version}))

      if (typeof parsedKey.name !== 'string' || typeof parsedKey.version !== 'string' || typeof parsedKey.path !== 'string' || typeof mod !== 'object') {
        throw new Error('Invalid params: ' + JSON.stringify(arguments))
      }

      if (this.metas[parsedKey.full] && meta === null) {
        delete this.metas[parsedKey.full]
        return
      }

      this.metas[parsedKey.full] = meta
      localStorage['tiki$' + parsedKey.full] = JSON.stringify(this.metas[parsedKey.full])
    },
    setMeta: function(name, version, meta) {
      if (typeof name !== 'string' || typeof version !== 'string' || typeof meta !== 'object') {
        throw new Error('Invalid params: ' + JSON.stringify(arguments))
      }

      if (this.metas[name] && this.metas[name].v[version] && meta === null) {
        delete this.metas[name].v[version]
        return
      }

      this.metas[name] = this.metas[name] || {v: {}, meta: {}}
      this.metas[name].v[version] = meta

      if (!this.metas[name].latest || version > this.metas[name].latest) {
        this.metas[name].latest = version
      }

      localStorage['tiki$' + name] = JSON.stringify(this.metas[name])
    },
    listVersions: function(name) {
      this.getPkgMeta(name)
      name = name.split('/')[0]
      if (this.metas[name]) {
        return Object.keys(this.metas[name].v)
      }
      return null
    },
    remove: function(name) {
      var keys = Object.keys(localStorage), i=0, l=keys.length

      // don't lock up the UI 
      (function innerRemove() {
        setTimeout(function() {
          if (keys[i].indexOf('tiki_' + name) === 0) {
            delete localStorage[keys[i]]
          }
          if (++i<l) innerRemove()
        }, 0)
      })()
      ;delete this.pkgs[name]
      ;delete this.meta[name]
      ;delete localStorage['tiki$'+name]
    }
}

/*
 * configuration settings 
 */
tiki.config = function(opts) {
  tiki.appid = opts.id
  tiki.debug = opts.debug
  if (tiki.debug) {
//      tiki.clear = clear
  }
}

/*
 * localStorage.clear() for all subs 
 */
tiki.clear = function() {
  console.debug('tiki.clear')
  localStorage.clear()
  var win = this.window || document.querySelector('iframe[data-tikiid]').contentWindow
  win.postMessage('clear','*')
}

if (!window.tiki) {
  console.debug('FROM CACHE')
  // loaded from cache
  queue = tiki.q = []
  window.addEventListener('message', function(e) {
    tiki.ready(e, arguments.callee)
  })
} else {
  console.debug('NOT FROM CACHE')
  tiki.ready()
}

// when loading from cache, we're requesting remotes before tiki.ready()