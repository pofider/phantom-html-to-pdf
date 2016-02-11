var path = require("path"),
    childProcess = require('child_process'),
    fs = require("fs");


module.exports = function(options, requestOptions, id, cb) {
    if (!options.phantomPath) {
        options.phantomPath = require('phantomjs').path;
    }

    var settingsFilePath = path.resolve(path.join(options.tmpDir, id + "settings.html"));

    fs.writeFile(settingsFilePath, JSON.stringify(requestOptions), function (err) {
        if (err)
            return cb(err);

        var childArgs = [
            '--ignore-ssl-errors=yes',
            '--web-security=false',
            '--ssl-protocol=any',
            path.join(__dirname, 'scripts', 'standaloneScript.js'),
            settingsFilePath
        ];

        var isDone = false;

        var data = "";
        var child = childProcess.execFile(requestOptions.phantomPath || options.phantomPath, childArgs, function (err, stdout, stderr) {
            if (isDone)
                return;

            isDone = true;
            if (err) {
                return cb(err);
            }

            var response = JSON.parse(data);
            response.logs.forEach(function(m) {
                m.timestamp = new Date(m.timestamp)
            })

            cb(null, {
                stream: fs.createReadStream(requestOptions.output),
                numberOfPages: response.numberOfPages,
                logs: response.logs
            });
        });

        child.stdout.on("data", function(d) {
            if (d) {
                data += d;
            }
        });

        setTimeout(function() {
            var timeoutErr;

            if (isDone)
                return;

            isDone = true;
            timeoutErr = new Error("Timeout when executing in phantom");
            timeoutErr.phantomTimeout = true;
            child.kill();

            cb(timeoutErr);
        }, requestOptions.timeout || options.timeout);
    });
};
