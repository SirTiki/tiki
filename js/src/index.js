console.debug('index.js');

if (e) {
	console.debug("localStorage('tiki')");
	
	localStorage.setItem('tiki',e.data);
	tiki.ready(event, arguments.callee);
}

//Must return truthy value for eval / to optimize include script
true;
//@ sourceURL=tiki.js