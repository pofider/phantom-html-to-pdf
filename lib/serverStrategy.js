var Phantom = require("phantom-workers"),
    fs = require("fs"),
    _ = require("lodash"),
    removeTempFileWhenConsumed = require('./removeTempFileWhenConsumed');

var phantoms = {};

function ensurePhantom(phantom, cb) {
    if (phantom.started)
        return cb();

    phantom.startCb = phantom.startCb || [];
    phantom.startCb.push(cb);

    if (phantom.starting)
        return;

    phantom.starting = true;

    phantom.start(function(startErr) {
        phantom.started = true;
        phantom.starting = false;
        phantom.startCb.forEach(function(cb) { cb(startErr); })
    });
}

module.exports = function(options, requestOptions, id, cb) {
    var phantomInstanceId = requestOptions.phantomPath || options.phantomPath || "default";

    if (!phantoms[phantomInstanceId]) {
        var opts = _.extend({}, options);
        opts.workerEnv = {
            'PHANTON_MAX_LOG_ENTRY_SIZE': options.maxLogEntrySize || 1000
        }
        opts.phantomPath = requestOptions.phantomPath || options.phantomPath;
        phantoms[phantomInstanceId] = Phantom(opts);
    }

    var phantom = phantoms[phantomInstanceId];

    ensurePhantom(phantom, function(err) {
        if (err)
            return cb(err);

        phantom.execute(requestOptions, function (err, res) {
            if (err) {
                // if the error is a timeout from phantom-workers
                if (err.message === "Timeout") {
                    err.phantomTimeout = true;
                }

                return cb(err);
            }

            if (res.isError) {
                var error = new Error(res.message);
                error.stack = res.stack;
                return cb(error);
            }

            res.logs.forEach(function(m) {
                m.timestamp = new Date(m.timestamp)
            })

            var outputStream = fs.createReadStream(requestOptions.output);

            removeTempFileWhenConsumed(requestOptions.output, outputStream);

            cb(null, {
                stream: outputStream,
                numberOfPages: res.numberOfPages,
                logs: res.logs
            });
        });
    })
};

module.exports.kill = function() {
    Object.keys(phantoms).forEach(function(key) {
        var phantom = phantoms[key]
        if (!phantom.started)
            return;

        phantom.started = false;
        phantom.startCb = [];
        return phantom.kill();
    });
    phantoms = {}
}
