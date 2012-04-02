
var fs = require('fs'),
	root = __dirname + '/../../public/example'
	express = require('express'),
	server1 = express.createServer(
			express.static(root + '/a', { maxAge: 9999999999 })
	),
	server2 = express.createServer(
			express.static(root + '/b', { maxAge: 9999999999 })
	);

server1.get('/', function(req, res) {
	fs.readFile(root + '/a.com.html', function(err, data) {
		res.writeHead(200);
		res.end(data);
	});
});
server1.get('/1', function(req, res) {
	fs.readFile(root + '/1.html', function(err, data) {
		res.writeHead(200);
		res.end(data);
	});
});
server1.get('/2', function(req, res) {
	fs.readFile(root + '/2.html', function(err, data) {
		res.writeHead(200);
		res.end(data);
	});
});
server1.listen(9000);


server2.get('/', function(req, res) {
	fs.readFile(root + '/b.com.html', function(err, data) {
		res.writeHead(200);
		res.end(data);
	});
});
server2.listen(9001);
