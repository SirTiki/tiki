console.debug('tiki.Store ctor')

var inherits = require('tiki/inherits')
  , EventEmitter = require('tiki/EventEmitter')
  , _ = require('tiki/underscore')

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

      if (store instanceof Store) {
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
  , mods: {}
  , getMod: function(name, version, cb) {
      console.debug('Store:::getMod: ', {name:name, version: version})

      var mod

      if (typeof version === 'function') {
        cb = version
        version = null
      }

      if (this.mods[name]) {
        return cb(this.mods[name].v[version || this.metas[name].latest])
      }

      mod = {meta: this.getMeta(name, version)}
      if (!mod.meta) {
        return cb(null)
      }

      this.mods[name] = mod
      this.getItem(name
      , version || this.metas[name].latest
      , function(val) {
          mod.files = val
          cb(mod)
        })
    }
  , setMod: function(name, version, mod) {
      console.debug('Store:::setMod: ', {name:name, version: version, meta: mod})

      if (typeof name !== 'string' || typeof version !== 'string' || typeof mod !== 'object') {
        throw new Error('Invalid params: ' + JSON.stringify(arguments))
      }

      mod = _.pick(mod, ['meta', 'files'])
      mod.meta = mod.meta || {}

      this.setMeta(name, version, mod.meta)
      this.mods[name] = this.mods[name] || {v: {}, meta: this.metas[name]}
      this.mods[name].v[version] = mod

      this.setItem(name, version, JSON.stringify(mod.files))
    }
  , getMeta: function(name, version) {
      console.debug('Store:::getMeta: ', {name:name, version: version})

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
  , setMeta: function(name, version, meta) {
      console.debug('Store:::setMeta: ', {name:name, version: version, meta: meta})

      this.metas[name] = this.metas[name] || {v: {}}
      if (typeof this.metas[name].ns === 'undefined') {
        this.metas[name].ns = this.allocateNS(name)
      }

      if (typeof version === 'string') {
        this.metas[name].v[version] = _.mask(meta, ['deps'])
        this.metas[name].latest = Object.keys(this.metas[name].v).sort(function(a, b) {return a < b})[0]
      } else {
        this.metas[name] = meta
      }
      this.store.setItem('$'+name, JSON.stringify(this.metas[name]))
    }
  , getItem: function(name, version, cb) {
      console.debug('Store:::getItem: ', name)

      var namespace = this.getNS(name)
        , store

      if (typeof namespace === 'undefined') {
        return cb()
      }
      if (namespace === '$') {
        return cb(this.store.getItem('_'+name + '@' + version))
      }

      store = this.stores[namespace] || new Store(namespace)
      if (store.store) {
        return cb(store.getItem(name, version))
      }

      store.on('load', function() {
        cb(store.getItem(name, version))
      })
    }
  , setItem: function(name, version, value) {
        if (''+value === '[object Object]') debugger
      console.debug('Store:::setItem: ', {name:name, version: version, value:value})

      var self = this
        , namespace = this.getNS(name)
        , store

      if (typeof namespace === 'undefined') {
        throw new Error('No metadata set for ', name)
      }
      if (name.split('.')[0] === 'tiki' && namespace !== '$') {
        throw new Error('tiki.* must be stored in $')
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
        var ret = store.setItem((namespace === '$' ? '_' : '') + name + '@' + version, value)

        if (ret === false) {
            throw new Error('Out of room in '+namespace)

            // if we're out of room
            // allocate
            // try to put it there
            // on success, update meta and delete old entry

            // Throw a BIG error if namespace === '$'

            self.allocate()
            ;delete store.store[name + '@' + version]
            self.setItem(name, value)
        }
      }
    }
  , setNS: function(name, ns) {
      console.debug('Store:::getNS: ', name)

      var meta = this.getMeta(name)
      meta.ns = ns
      this.setMeta(meta)
    }
  , getNS: function(name) {
      console.debug('Store:::getNS: ', name)

      return (this.getMeta(name) || {}).ns
    }
  , allocate: function() {
      this.store.setItem('lastNS', ++this.lastNS)
      return this.lastNS
    }
  , allocateNS: function(path) {
      return path.split('.')[0] === 'tiki' ? '$' : this.lastNS
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

All tiki.* get store in $
No tiki.* can be depend on a non-tiki.* module
=> when storing tiki.*
  1. setItem into $
  2. setMeta: deps must all be tiki.* (throw error)

*/