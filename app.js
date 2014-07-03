'use strict';

var fs = require('fs');
var path = require('path');
var http = require('http');
var qs = require('qs');
var promisify = require('es6-promisify');
var StreamSpeed = require('stream-speed');
var stat = promisify(fs.stat);

var files = {};

files['10m'] = path.join(__dirname, 'files', '10m');
files['5m'] = path.join(__dirname, 'files', '5m');

http
  .createServer(function (req, res) {
    var query = req.url
      .split('?')
      .slice(1)
      .join('?');
    
    query = qs.parse(query);

    var file = files[query.file];

    if (!file) {
      res.statusCode = 404;
      res.end('404 Not Found');
      return;
    }

    stat(file)
      .then(function (stat) {
        res.writeHead(200, {
          'Content-disposition': 'attachment; filename=' + query.file,
          'Content-Type': 'application/force-download',
          'Content-Length': stat.size
        });
      })

      .then(function () {
        var ss = new StreamSpeed();

        fs.createReadStream(file)
          .pipe(ss)
          .pipe(res)
          .on('finish', function () {
            var record = {
              average: Math.round(ss.average * 1000 / 1024 * 100) / 100,
              ip: req.connection.remoteAddress
            };

            console.log(JSON.stringify(record));

            res.end();
          });
      })

      .catch(function () {
        res.statusCode = 503;
        res.end('503 Service Unavailable');
      });
  })
  .listen(8080);
