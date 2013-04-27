define('tiki.globalEval', function() {
	console.debug('tiki.globalEval ctor');
	
	function globalEval( data ) {
		if ( data && (/\S/).test( data ) ) {
			return ( function( data ) {
				return (1,window.eval).call( window, data );
			} )( data );
		}
	}
	
	return globalEval;
});