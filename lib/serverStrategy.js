var Phantom = require("phantom-workers"),
    fs = require("fs");

var phantom;

var startCb = [];
var starting, started;
function ensurePhantom(cb) {
    if (started)
        return cb();

    startCb.push(cb);

    if (starting)
        return;

    starting = true;
    // TODO: handle callback err for .start
    phantom.start(function() {
        started = true;
        starting = false;
        startCb.forEach(function(cb) { cb();})
    });
}

module.exports = function(options, requestOptions, id, cb) {
    if (!phantom)
        phantom = Phantom(options);


    ensurePhantom(function(err) {
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

            cb(null, {
                stream: fs.createReadStream(requestOptions.output),
                numberOfPages: res
            });
        });
    })
};

module.exports.kill = function() {
    if (!started)
        return;

    started = false;
    startCb = [];
    return phantom.kill();
}
