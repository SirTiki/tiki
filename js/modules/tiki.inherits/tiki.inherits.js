define('tiki.inherits', function() {
	function inherits(ctor, superCtor) {
		ctor.super_ = superCtor;
		ctor.prototype = Object.create(superCtor.prototype, {
			constructor: {
				value: ctor,
				enumerable: false
			}
		});
	}
	
	return inherits;
});