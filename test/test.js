var should = require("should"),
    path = require("path"),
    fs = require("fs"),
    phantomjs = require("phantomjs"),
    phantomjs2 = require("phantomjs-prebuilt")
    tmpDir = path.join(__dirname, "temp"),
    conversion = require("../lib/conversion.js")({
        timeout: 10000,
        tmpDir: tmpDir,
        portLeftBoundary: 10000,
        portRightBoundary: 15000
    });

describe("phantom html to pdf", function () {

    describe("phantom-server", function () {
        common("phantom-server");
    });

    describe("dedicated-process", function () {
        common("dedicated-process");
    });

    describe("extra options", function () {
        it('should be able to configure maxLogEntrySize in dedicated-process', testMaxLogEntrySize('dedicated-process'));
        it('should be able to configure maxLogEntrySize in phantom-server', testMaxLogEntrySize('phantom-server'));

        function testMaxLogEntrySize(strategy) {
            return function(done) {
                conversion.kill();
                var cvn = require("../lib/conversion.js")({
                    timeout: 10000,
                    tmpDir: tmpDir,
                    strategy: strategy,
                    maxLogEntrySize: 2
                });

                cvn({
                    html: '<script>console.log("123")</script>'
                }, function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    JSON.stringify(res.logs).should.containEql('12...');
                    done();
                });
            }
        }
    })

    function common(strategy) {

        beforeEach(function() {
            rmDir(tmpDir);
            conversion.options.strategy = strategy;
        });

        it("should set number of pages correctly", function (done) {
            conversion("<h1>aa</h1><div style='page-break-before: always;'></div><h1>bb</h1>", function (err, res) {
                if (err)
                    return done(err);

                res.numberOfPages.should.be.eql(2);
                done();
            });
        });

        it("should create a pdf file", function (done) {
            conversion("foo", function (err, res) {
                if (err)
                    return done(err);

                res.numberOfPages.should.be.eql(1);
                res.stream.should.have.property("readable");
                done();
            });
        });

        it("should work with multiple phantom paths", function (done) {
            conversion({ html: "foo", phantomPath: phantomjs.path}, function (err, res) {
                if (err)
                    return done(err);

                res.numberOfPages.should.be.eql(1);
                res.stream.should.have.property("readable");

                conversion({ html: "foo", phantomPath: phantomjs2.path}, function (err, res){
                    if (err)
                        return done(err);

                    res.numberOfPages.should.be.eql(1);
                    res.stream.should.have.property("readable");

                    done();
                });
            });
        });

        it('should create a pdf file ignoring ssl errors', function(done) {
            conversion({
                url: 'https://sygris.com'
            }, function(err, res) {
                if (err) {
                    return done(err);
                }

                res.numberOfPages.should.be.eql(1);
                res.stream.should.have.property("readable");
                done();
            });
        });

        it('should wait for page js execution', function(done) {
            conversion({
                html: '<h1>aa</h1><script>window.PHANTOM_HTML_TO_PDF_READY = true;</script>',
                waitForJS: true
            }, function(err, res) {
                if (err) {
                    return done(err);
                }

                res.numberOfPages.should.be.eql(1);
                res.stream.should.have.property("readable");
                done();
            });
        });

        it('should wait for page async js execution', function(done) {
            conversion({
                html: '<h1>aa</h1><script>setTimeout(function() { window.PHANTOM_HTML_TO_PDF_READY = true; }, 200);</script>',
                waitForJS: true
            }, function(err, res) {
                if (err) {
                    return done(err);
                }

                res.numberOfPages.should.be.eql(1);
                res.stream.should.have.property("readable");
                done();
            });
        });

        it('should allow define a custom var name for page js execution', function(done) {
            conversion({
                html: '<h1>aa</h1><script>window.ready = true;</script>',
                waitForJS: true,
                waitForJSVarName: 'ready'
            }, function(err, res) {
                if (err) {
                    return done(err);
                }

                res.numberOfPages.should.be.eql(1);
                res.stream.should.have.property("readable");
                done();
            });
        });

        it('should throw timeout when waiting for page js execution', function(done) {
            //since phantom-worker doesn't support a timeout per request
            //we increase the test timeout
            this.timeout(20000);

            conversion({
                html: '<h1>aa</h1>',
                timeout: 500,
                waitForJS: true
            }, function(err, res) {
                if (!err) {
                    return done(new Error('the conversion doesn\'t throw error'));
                }

                if (err.phantomTimeout !== undefined) {
                    should(err.phantomTimeout).be.eql(true);
                    done();
                } else {
                    done(err);
                }
            });
        });

        it('should return output with logged phantomjs messages', function(done) {
            conversion({
                html: '<script>var a = foo</script>'
            }, function(err, res) {
                if (err) {
                    return done(err);
                }

                JSON.stringify(res.logs).should.containEql('foo');
                done();
            });
        });

        it('should return output with logged console messages', function(done) {
            conversion({
                html: '<script>console.log("foo")</script>'
            }, function(err, res) {
                if (err) {
                    return done(err);
                }

                JSON.stringify(res.logs).should.containEql('foo');
                done();
            });
        });

        it('should trim logs for long base64 encoded images', function(done) {
            var img = "start"
            for (var i = 0; i < 40000; i++) {
                img += 'fooooooooo';
            }

            conversion({
                html: '<img src="data:image/png;base64,' + img + '" />'
            }, function(err, res) {
                if (err) {
                    return done(err);
                }

                JSON.stringify(res.logs).should.containEql('start');
                done();
            });
        });

        it('should allow to inject js files to the page', function(done) {
            conversion({
                html: 'foo',
                injectJs: [
                    path.join(__dirname, 'injectjs.js')
                ]
            }, function(err, res) {
                if (err)
                    return done(err);

                JSON.stringify(res.logs).should.containEql('INJECTJS TEST');
                done();
            })
        });
    }

    rmDir = function (dirPath) {
        if (!fs.existsSync(dirPath))
            fs.mkdirSync(dirPath);

        try {
            var files = fs.readdirSync(dirPath);
        }
        catch (e) {
            return;
        }
        if (files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                var filePath = dirPath + '/' + files[i];
                try {
                    if (fs.statSync(filePath).isFile())
                        fs.unlinkSync(filePath);
                } catch (e) {
                }
            }
        }
    };
});