var express = require('express');
var serveStatic = require('serve-static');
var bodyParser = require('body-parser');

var server = express();

server.use(bodyParser.json());
server.use(bodyParser.urlencoded());
server.use(serveStatic('public', {}));

server.post('*', function(req, res) {
  console.log(req.body.msg);
  res.end('OK');
});

server.get('/log', function(req, res) {
  console.log(decodeURIComponent(req.query.msg));
  res.end('OK');
});

server.listen(8000);
console.log('App listening on port 8000');
