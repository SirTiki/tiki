console.debug('tiki/Store ctor')

var inherits = require('tiki/inherits')
  , EventEmitter = require('tiki/EventEmitter')
  , _ = require('tiki/underscore')
  , keyParser = require('tiki/keyParser')

module.exports = Store
function Store(namespace) {
  console.debug('Store::ctor: ', namespace)

  var self = this
    , el

  EventEmitter.call(this)
  this.namespace = namespace

  // Handle lookup Store
  if (namespace === null) {
    this.store = localStorage
    return
  }

  if (isNaN(parseInt(namespace, 10))) {
    throw new Error('Numeric namespace is required: ',namespace)
  }

  namespace = parseInt(namespace, 10)
  Store.stores[namespace] = this
  el = document.createElement('iframe')
  el.src = 'http://A'+namespace+'.'+window.location.host+'/empty.html'
  el.addEventListener('load', function() {
      console.debug('Store::ctor::load: ', self.namespace)

      self.store = this.contentWindow.localStorage
      self.emit('load')
    }
  , false)

  setTimeout(function() {
      document.body.appendChild(el)
    }
  , 30)
}

inherits(Store, EventEmitter)
_.extend(Store.prototype
, {
    getItem: function(key) {
      console.debug('Store::getItem: ', key)

      return this.store[key]
    }
  , setItem: function(key, val) {
      console.debug('Store::setItem: ', {key: key, val:val})

      var store = this.store

      if (Object.prototype.toString.call(store) === '[object Storage]') {
        try {
          store[key] = val
        } catch(e) {
          return false
        }
      } else {
        throw new Error('Store is unset.')
      }
    }
  , clear: function() {
      console.debug('Store::clear')

      return this.store.clear()
    }
  })

_.extend(Store
, {
    lastNS: typeof localStorage.lastNS !== 'undefined' ? localStorage.lastNS : 0
  , store: new Store(null)
  , stores: []
  , metas: {}
  , pkgs: {}
  , getPkg: function(name, version, cb) {
      console.debug('Store:::getPkg: ', {name:name, version: version})

      var mod

      if (typeof version === 'function') {
        cb = version
        version = null
      }

      if (this.pkgs[name]) {
        return cb(this.pkgs[name].v[version || this.metas[name].latest])
      }

      mod = {meta: this.getMeta(name, version)}
      if (!mod.meta) {
        return cb(null)
      }

      this.pkgs[name] = mod
      this.getItem(name
      , version || this.metas[name].latest
      , function(val) {
          mod.mods = val
          cb(mod)
        })
    }
  , getMod: function(fullName, cb) {
      console.debug('Store:::getMod: ', {fullName: fullName})

      var key = keyParser.parse(fullName)
        , mod

      key.version = key.version || this.metas[name].latest
      if (this.pkgs[key.name] && this.pkgs[key.name].v[key.version] && this.pkgs[key.name].v[key.version].mods[key.module]) {
        return cb(this.pkgs[key.name].v[key.version].mods[key.module])
      }

      this.getItem(fullName, cb)
    }
  , setMod: function(fullName, mod) {
      console.debug('Store:::setMod: ', {fullName: fullName, meta: mod})

      var key = keyParser.parse(fullName)
        , mod

      if (typeof key.name !== 'string' || typeof key.version !== 'string' || typeof key.module !== 'string' || typeof mod !== 'object') {
        throw new Error('Invalid params: ' + JSON.stringify(arguments))
      }

      mod = _.pick(mod, ['meta', 'src'])
      mod.meta = mod.meta || {deps: []}

      this.setModMeta(fullName, mod.meta)
      this.pkgs[key.name] = this.pkgs[key.name] || {v: {}, meta: this.metas[key.name]}
      this.pkgs[key.name].v[key.version] = {mods: {}}
      this.pkgs[key.name].v[key.version].mods[key.module] = mod

      this.setItem(fullName, JSON.stringify(mod.src))
    }
  , getPkgMeta: function(name, version) {
      console.debug('Store:::getPkgMeta: ', {name:name, version: version})

      var meta

      if (!this.metas[name] || !this.metas[name].v[version]) {
        meta = this.store.getItem('$'+name)
        if (meta) {
          this.metas[name] = JSON.parse(meta)
        }
      }

      if (typeof version === 'string') {
        return this.metas[name].v[version || this.metas[name].latest]
      }
      return this.metas[name]
    }
  , setPkgMeta: function(name, version, meta) {
      console.debug('Store:::setPkgMeta: ', {name:name, version: version, meta: meta})

      this.metas[name] = this.metas[name] || {v: {}}
      if (typeof this.metas[name].ns === 'undefined') {
        this.metas[name].ns = this.allocateNS(name)
      }

      if (typeof version === 'string') {
        this.metas[name].v[version] = _.pick(meta, ['deps'])
        this.metas[name].latest = Object.keys(this.metas[name].v).sort(function(a, b) {return a < b})[0]
      } else {
        this.metas[name] = meta
      }
      this.store.setItem('$'+name, JSON.stringify(this.metas[name]))
    }
  , getModMeta: function(fullName) {
      console.debug('Store:::getModMeta: ', {fullName: fullName})

      var meta

      if (!this.metas[fullName]) {
        meta = this.store.getItem('$'+fullName)
        if (meta) {
          this.metas[fullName] = JSON.parse(meta)
        }
      }

      return this.metas[fullName]
    }
  , setModMeta: function(fullName, meta) {
      console.debug('Store:::setModMeta: ', {fullName:fullName, meta: meta})

      var ns = this.metas[fullName] && this.metas[fullName].ns
      this.metas[fullName] = meta || {}
      if (typeof ns === 'undefined') {
        this.metas[fullName].ns = this.allocateNS(fullName)
      } else this.metas[fullName].ns = ns

      this.store.setItem('$'+fullName, JSON.stringify(this.metas[fullName]))
    }
  , getItem: function(fullName, cb) {
      console.debug('Store:::getItem: ', fullName)

      var namespace = this.getNS(fullName)
        , store

      if (typeof namespace === 'undefined') {
        return cb()
      }
      if (namespace === '$') {
        return cb(this.store.getItem('_'+fullName))
      }

      store = this.stores[namespace] || new Store(namespace)
      if (store.store) {
        return cb(store.getItem(fullName))
      }

      store.on('load', function() {
        cb(store.getItem(fullName))
      })
    }
  , setItem: function(fullName, value) {
      console.debug('Store:::setItem: ', {fullName: fullName, value:value})

      var self = this
        , namespace = this.getNS(fullName)
        , store

      if (typeof namespace === 'undefined') {
        throw new Error('No metadata set for ', fullName)
      }
      if (fullName.split('@')[0] === 'tiki' && namespace !== '$') {
        throw new Error('tiki/* must be stored in $')
      }

      if (namespace === '$') {
        store = this.store
      } else {
        if (!this.stores[namespace]) {
          this.stores[namespace] = new Store(namespace)
        }
        store = this.stores[namespace]
      }

      if (store.store) {
        finish()
      } else {
        store.on('load', function() {
          store.removeListener(arguments.callee)
          finish()
        })
      }

      function finish() {
        var ret = store.setItem((namespace === '$' ? '_' : '') + fullName, value)

        if (ret === false) {
            throw new Error('Out of room in '+namespace)

            // if we're out of room
            // allocate
            // try to put it there
            // on success, update meta and delete old entry

            // Throw a BIG error if namespace === '$'

            self.allocate()
            ;delete store.store[fullName]
            self.setItem(fullName, value)
        }
      }
    }
  // , setNS: function(name, ns) {
  //     console.debug('Store:::getNS: ', name)

  //     var meta = this.getModMeta(name)
  //     meta.ns = ns
  //     this.setMeta(meta)
  //   }
  , getNS: function(fullName) {
      console.debug('Store:::getNS: ', fullName)

      return (this.getModMeta(fullName) || this.getPkgMeta(fullName) || {}).ns
    }
  , allocate: function() {
      this.store.setItem('lastNS', ++this.lastNS)
      return this.lastNS
    }
  , allocateNS: function(path) {
      return path.split('@')[0] === 'tiki' || path.split('/')[0] === 'tiki' ? '$' : this.lastNS
    }
  , clear: function() {
      console.debug('Store:::clear: ', this.stores)

      var i

      for(i=0; i<=this.lastNS; ++i) {
        (function(store){
          store.on('load', function() {
            store.clear()
          })
        })(new Store(i))
      }
      this.store.clear()
    }
  })

/*

- s

All tiki/* get store in $
No tiki/* can be depend on a non-tiki/* module
=> when storing tiki/*
  1. setItem into $
  2. setMeta: deps must all be tiki/* (throw error)

*/