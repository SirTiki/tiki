eval(localStorage.getItem('_boostrap'))||(function() {
	if (typeof localStorage['_bootstrap'] === 'undefined') {
		localStorage['_bootstrap'] = window.seed.bootstrap;
	}
	eval(window.seed.bootstrap);
})();
