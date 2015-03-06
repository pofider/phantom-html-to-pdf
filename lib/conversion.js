var path = require("path"),
    Phantom = require("phantom-workers"),
    fs = require("fs"),
    uuid = require("uuid").v1,
    tmpDir = require("os").tmpdir();

var phantom;
var options;

function ensurePhantom(cb) {
    if (phantom.running)
        return cb();

    phantom.start(cb);
}

function convert(opt, cb) {
    if (typeof opt == 'string' || opt instanceof String) {
        opt = {
            html: opt
        }
    }

    opt.paperSize = opt.paperSize || {};
    opt.settings = opt.settings || {};

    ensurePhantom(function (err) {
        if (err)
            return cb(err);

        var id = uuid();
        opt.url = opt.url || "file:///" + encodeURIComponent(path.resolve(path.join(options.tmpDir, id + ".html")));
        opt.output = path.resolve(path.join(options.tmpDir, id + ".pdf"));

        fs.writeFile(path.join(options.tmpDir, id + ".html"), opt.html, function () {
            if (err)
                return cb(err);

            phantom.execute(opt, function (err, res) {
                if (err)
                    return cb(err);

                cb(null, {
                    stream: fs.createReadStream(opt.output),
                    numberOfPages: res
                });
            });
        });
    });
}

module.exports = function (opt) {
    options = opt || {};
    options.timeout = options.timeout || 180000;
    options.numberOfWorkers = options.numberOfWorkers || 2;
    options.pathToPhantomScript = options.pathToPhantomScript || path.join(__dirname, "phantomScript.js");
    options.tmpDir = options.tmpDir || tmpDir;

    phantom = Phantom(options);

    return convert;
};

