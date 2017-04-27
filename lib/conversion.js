var path = require("path"),
    fs = require("fs"),
    uuid = require("uuid").v1,
    tmpDir = require("os").tmpdir(),
    _ = require('lodash');

 var options;
function writeHtmlFile(opt, type, id, cb) {
    if (!opt[type])
        return cb();

    var htmlPath = path.resolve(path.join(options.tmpDir, id + type + ".html"));
    opt[type + "File"] = path.resolve(htmlPath);
    fs.writeFile(htmlPath, opt[type], cb);
}

function writeHtml(opt, id, cb) {
    writeHtmlFile(opt, "html", id, function (err) {
        if (err)
            return cb(err);

        writeHtmlFile(opt, "header", id, function (err) {
            if (err)
                return cb(err);

            writeHtmlFile(opt, "footer", id, function (err) {
                if (err)
                    return cb(err);

                cb();
            });
        });
    });
}

function convert(conversionOptions, cb) {
    var opt = _.cloneDeep(conversionOptions);
    if (typeof opt == 'string' || opt instanceof String) {
        opt = {
            html: opt
        }
    }

    opt.viewportSize = opt.viewportSize || {};
    opt.paperSize = opt.paperSize || {};
    opt.settings = opt.settings || {};
    opt.fitToPage = opt.fitToPage || false;
    opt.waitForJSVarName = opt.waitForJSVarName  || 'PHANTOM_HTML_TO_PDF_READY';
    opt.injectJs = opt.injectJs || [];
    opt.cookies = opt.cookies || [];
    
    if (opt.waitForJS && opt.settings.javascriptEnabled === false) {
        throw new Error('can\'t use waitForJS option if settings.javascriptEnabled is not activated');
    }

    var id = uuid();

    writeHtml(opt, id, function (err) {
        if (err) {
            return cb(err);
        }

        opt.url = opt.url || "file:///" + encodeURIComponent(opt.htmlFile);
        opt.output = path.resolve(path.join(options.tmpDir, id + ".pdf"));

        delete opt.html;

        if (options.strategy === "phantom-server")
            return require("./serverStrategy.js")(options, opt, id, checkIfShouldRemoveTempFile);
        if (options.strategy === "dedicated-process")
            return require("./dedicatedProcessStrategy.js")(options, opt, id, checkIfShouldRemoveTempFile);

        // verify if we should remove the pdf temp file,
        // only if the user has not done any intention to consume the file stream
        function checkIfShouldRemoveTempFile(err, resp) {
            var shouldRemoveTempFile = false;

            if (err) {
                return cb(err);
            }

            if (resp.stream == null) {
                return cb(null, resp);
            }

            // executing the callback
            cb(null, resp);

            // on the next tick of the event loop verify if file stream is consumed..
            process.nextTick(function() {
                if (resp.stream._readableState.flowing === false &&
                    resp.stream._readableState.reading === false &&
                    resp.stream._readableState.calledRead === false &&
                    resp.stream._readableState.needReadable === false) {
                    // in node 0.10.x these properties tell if a stream is not consumed either on flowing or paused mode
                    shouldRemoveTempFile = true;
                } else if (resp.stream._readableState.flowing === null &&
                    resp.stream._readableState.needReadable === false) {
                    // in node 0.12.x and 4.x.x, 5.x.x, 6.x.x, 7.x.x ... these properties tell if a stream is not consumed either on flowing or paused mode
                    shouldRemoveTempFile = true;
                }

                if (shouldRemoveTempFile) {
                    fs.unlink(resp.stream.path, function() { /* ignore any error when deleting the file */ });
                }
            });
        }

        cb(new Error("Unsupported strategy " + options.strategy));
    });
}

function kill() {
    require("./serverStrategy.js").kill();
}

module.exports = function (opt) {
    options = opt || {};
    options.timeout = options.timeout || 180000;
    options.numberOfWorkers = options.numberOfWorkers || 2;
    options.pathToPhantomScript = options.pathToPhantomScript || path.join(__dirname, "scripts", "serverScript.js");
    options.tmpDir = options.tmpDir || tmpDir;
    options.strategy = options.strategy || "phantom-server";

    // always set env var names for phantom-workers (don't let the user override this config)
    options.hostEnvVarName = 'PHANTOM_WORKER_HOST';
    options.portEnvVarName = 'PHANTOM_WORKER_PORT';

    convert.options = options;
    convert.kill = kill;

    return convert;
};
