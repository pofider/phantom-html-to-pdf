var path = require("path"),
    Phantom = require("phantom-workers"),
    fs = require("fs"),
    uuid = require("uuid").v1,
    tmpDir = require("os").tmpdir();

var phantom;
var options;

var startCb = [];
var starting, started;
function ensurePhantom(cb) {
    if (phantom.running)
        return cb();

    if (started)
        return cb();

    startCb.push(cb);

    if (starting)
        return;

    starting = true;
    phantom.start(function() {
        started = true;
        startCb.forEach(function(cb) { cb();})
    });
}

function writeHtmlFile(opt, type, id, cb) {
    if (!opt[type])
        return cb();

    var htmlPath = path.resolve(path.join(options.tmpDir, id + type + ".html"));
    opt[type + "File"] = path.resolve(htmlPath);
    fs.writeFile(htmlPath, opt[type], cb);
}

function writeHtml(opt, id, cb) {
    writeHtmlFile(opt, "html", id, function(err) {
        if (err)
            return cb(err);

        writeHtmlFile(opt, "header", id, function(err) {
            if (err)
                return cb(err);

            writeHtmlFile(opt, "footer", id, function(err) {
                if (err)
                    return cb(err);

                cb();
            });
        });
    });
}

function convert(opt, cb) {
    if (typeof opt == 'string' || opt instanceof String) {
        opt = {
            html: opt
        }
    }

    opt.viewportSize = opt.viewportSize || {};
    opt.paperSize = opt.paperSize || {};
    opt.settings = opt.settings || {};

    ensurePhantom(function (err) {
        if (err)
            return cb(err);

        var id = uuid();

        writeHtml(opt, id, function(err) {
            if (err){
                return cb(err);
            }

            opt.url = opt.url || "file:///" + encodeURIComponent(opt.htmlFile);
            opt.output = path.resolve(path.join(options.tmpDir, id + ".pdf"));

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

