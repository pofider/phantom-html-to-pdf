var path = require("path"),
    fs = require("fs"),
    uuid = require("uuid/v4"),
    tmpDir = require("os").tmpdir(),
    _ = require('lodash'),
    proxy = require('./proxy');

var proxyServer;

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

let proxyInitializing = false
let proxyInitializingCbs = []
function initProxy(cb) {
  if (!convert.options.proxyHttpsCallsToResources) {
    return cb();
  }

  if (proxyServer) {
    return cb();
  }
  
  if (proxyInitializing) {
    return proxyInitializingCbs.push((err) => cb(err))    
  }

  proxyInitializing = true

  proxy((err, server) => {
    if (err) {
        proxyInitializing = false;
        process.nextTick(() => proxyInitializingCbs.forEach(c => c(err)))
        proxyInitializingCbs = [];
        return cb(err);
    }

    proxyServer = server;
    convert.options.httpsResourceProxyUrl = 'http://localhost:' + server.address().port + '/?url='
    cb();
    proxyInitializingCbs.forEach(c => c());
    proxyInitializing = false;
    proxyInitializingCbs = [];
  });
}

function convert(conversionOptions, cb) {
    initProxy((err) => {
        if (err) {
            return cb(err)
        }

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

        var id = opt.tmpId || uuid();

        writeHtml(opt, id, function (err) {
            if (err) {
                return cb(err);
            }

            opt.url = opt.url || "file:///" + encodeURIComponent(opt.htmlFile);
            opt.output = path.resolve(path.join(options.tmpDir, id + ".pdf"));

            delete opt.html;

            if (options.strategy === "phantom-server")
                return require("./serverStrategy.js")(options, opt, id, cb);
            if (options.strategy === "dedicated-process")
                return require("./dedicatedProcessStrategy.js")(options, opt, id, cb);

            cb(new Error("Unsupported strategy " + options.strategy));
        });
    });    
}

function kill() {
    if (proxyServer) {
        proxyInitializingCbs = []
        proxyServer.close()
    }

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
