var util = require('util'),
    fs = require('fs'),
    zlib = require('zlib');

var tilelive = require('tilelive');

var Composite = require('./index.js')(tilelive);

require('tilelive-mapbox')(tilelive);
require('tilelive-tmsource')(tilelive);
require('tilejson').registerProtocols(tilelive);
require('tilelive-http')(tilelive);

new Composite('../sources.json', function (err, mod) {
    if (err) { return console.error(err); }

    mod.getTile(0, 0, 0, function (err, pbfz) {
        if (err) {
            return console.error(err);
        }
        // console.log(data.length);
        zlib.gunzip(pbfz, function (err, pbf) {
            fs.writeFileSync('./composite-output.pbf', pbf);
        });
    });
});
