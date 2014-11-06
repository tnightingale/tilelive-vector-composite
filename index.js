var fs = require('fs'),
    zlib = require('zlib'),
    url = require('url'),
    path = require('path');

var Q = require('q'),
    Promise = Q.Promise,
    mapnik = require('mapnik'),
    Backend = require('tilelive-vector').Backend;


function Composite(uri, callback) {
    uri = url.parse(uri);
    uri.pathname = path.resolve(uri.pathname);
    uri.hostname = "";

    var filename = path.join(uri.hostname + uri.pathname),
        self = this;
        done = function (sources) { return callback(null, self); },
        error = function (err) { return callback(err); };

    this.sourceList = [];
    this.sources = {};

    this.parseSources(filename)
        .then(this.loadSources.bind(this))
        .then(done)
        ['catch'](error);
}

module.exports = function (tilelive, options) {
    Composite.registerProtocols = function (tilelive) {
        tilelive.protocols['composite:'] = this;
    };

    Composite.prototype.getTile = function (z, x, y, callback) {
        if (!this.sourceList.length) {
            return setImmediate(callback, [new Error("No sources loaded, call getInfo()")]);
        }

        var compositeTiles = this.compositeTiles.bind(this),
            sources = this.sources,
            tiles = this.sourceList.map(function (source) {
                return new Promise(function (resolve, reject) {
                    sources[source.uri].getTile(z, x, y, function (err, tile, responseHeaders) {
                        if (err) { return reject(err); }
                        return resolve(tile);
                    });
                });
            });

        return Q.all(tiles)
            .then(function (vtiles) {
                return compositeTiles(z, x, y, vtiles);
            })
            .then(function (pbfz) {
                return callback(null, pbfz);
            })
            ['catch'](function (err) {
                return callback(err);
            });
    };

    Composite.prototype.getGrid = function (z, x, y, callback) {
        return setImmediate(callback, [new Error('getGrid() is not supported for the composite vector Tilesource.')]);
    };

    Composite.prototype.getInfo = function (callback) {
        if (!this.sourceList.length) {
            return setImmediate(callback, ["No sources loaded, call getInfo()"]);
        }
        return this.getInfoSources(this.sourceList)
            .then(function (sources) {
                var layers = sources.reduce(function (prev, curr) {
                        return !curr.vector_layers ? prev : prev.concat(curr.vector_layers);
                    }, []);

                return callback(null, {
                    center: [ -123.1284, 49.2785, 15 ],
                    minzoom: 0,
                    maxzoom: 20,
                    vector_layers: layers
                });
            })
            ['catch'](function (err) {
                return callback(err);
            });
    };

    Composite.prototype.parseSources = function (filename) {
        var self = this;

        return new Promise(function (resolve, reject) {
            return Q.nfcall(fs.readFile, filename, "utf8").then(function (data) {
                var sources = JSON.parse(data);

                self.sourceList = sources;
                return resolve(sources);
            });
        });
    };

    Composite.prototype.loadSources = function (sources) {
        var tileliveLoad = this.tileliveLoad.bind(this);

        return Promise.all(sources.map(tileliveLoad));
    };

    Composite.prototype.getInfoSources = function (sources) {
        var tileliveGetInfo = this.tileliveGetInfo.bind(this);

        return Promise.all(sources.map(tileliveGetInfo));
    };

    Composite.prototype.tileliveLoad = function (source) {
        var sources = this.sources,
            uri = source.uri;

        return new Promise(function (resolve, reject) {
            sources[uri] = new Backend({ uri: uri, scale: 1 }, function (err, backend) {
                if (err) { return reject(err); }
                resolve(backend);
            });
        });
    };

    Composite.prototype.tileliveGetInfo = function (source) {
        var sources = this.sources,
            uri = source.uri;

        return new Promise(function (resolve, reject) {
            sources[uri].getInfo(function (err, info) {
                if (err) { return reject(err); }
                resolve(info);
            });
        });
    };

    Composite.prototype.compositeTiles = function (z, x, y, vtiles) {
        var vtile = new mapnik.VectorTile(z, x, y);

        vtile.composite(vtiles);
        vtile.parse();

        return new Promise(function (resolve, reject) {
            var data = vtile.getData();

            zlib.gzip(data, function (err, pbfz) {
                if (err) { return reject(error); }
                return resolve(pbfz);
            });
        });
    };

    Composite.registerProtocols(tilelive);

    return Composite;
};
