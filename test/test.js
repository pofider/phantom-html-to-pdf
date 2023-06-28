var should = require("should"),   
    path = require("path"),
    fs = require("fs"),    
    phantomjs = require("phantomjs"),
    phantomjs2 = require("phantomjs-prebuilt")
    tmpDir = path.join(__dirname, "temp"),
    https = require('https'),
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

        it('should be able to route requests through https proxy with dedicated-process', testHttpsResourceProxy('dedicated-process', 'https://jsreport.net/img/home.jpg'));
        it('should be able to route requests through https proxy with with phantom-server', testHttpsResourceProxy('phantom-server', 'https://jsreport.net/img/home.jpg'));

        it('should be able to route requests through https proxy and handle errors with dedicated-process', testHttpsResourceProxy('dedicated-process', 'https://wrongwrongXXX.net/img/home.jpg'));
        it('should be able to route requests through https proxy and handle errors with phantom-server', testHttpsResourceProxy('phantom-server', 'https://wrongwrongXXX.net/img/home.jpg'));

        it('should be able to route requests through https proxy with parallel call and dedicated-process', testHttpsResourceProxyParallelCall('dedicated-process'));
        it('should be able to route requests through https proxy with parallel call and  phantom-server', testHttpsResourceProxyParallelCall('phantom-server'));

        function testHttpsResourceProxy(strategy, url) {
            return function(done) {
                conversion.kill();               
                var cvn = require("../lib/conversion.js")({
                    timeout: 10000,
                    tmpDir: tmpDir,
                    strategy: strategy,
                    proxyHttpsCallsToResources: true
                });
    
                cvn({
                    html: `<img src="${url}"></img>`
                }, function(err, res) {                   
                    if (err) {
                        return done(err);    
                    }
                    
                    res.numberOfPages.should.be.eql(1);
                    done();
                });                            
            }
        }

        function testHttpsResourceProxyParallelCall(strategy) {
            return function(done) {
                conversion.kill();               
                var cvn = require("../lib/conversion.js")({
                    timeout: 10000,
                    tmpDir: tmpDir,
                    strategy: strategy,
                    proxyHttpsCallsToResources: true
                });

                let count = 0

                cvn({
                    html: `<img src="https://jsreport.net/img/home.jpg"></img>`
                }, function(err, res) {                   
                    if (err) {
                        return done(err);    
                    }         
                    
                    if (++count === 2) {                 
                        done();
                    }
                });           
    
                cvn({
                    html: `<img src="https://jsreport.net/img/home.jpg"></img>`
                }, function(err, res) {                   
                    if (err) {
                        return done(err);    
                    }                    
                 
                    if (++count === 2) {                 
                        done();
                    }
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

                ;
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

        it('should include user defined cookies in http requests', function(done) {
            conversion({
                html: '<script>console.log(document.cookie);</script>',
                cookies: [
                    { 
                        name: 'test-cookie1', 
                        value: 'test-value1', 
                        path: '/',                        
                    },
                    { 
                        name: 'test-cookie2', 
                        value: 'test-value2', 
                        path: '/',                        
                    }
                ]
            }, function(err, res) {
                if (err)
                    return done(err);
                JSON.stringify(res.logs).should.containEql('test-cookie1=test-value1; test-cookie2=test-value2');
                done();
            })
        });

        it('should reject local files', function(done) {
            conversion({
                html: '<script>document.write(window.location="' + __filename.replace(/\\/g, '/') + '")</script>',
            }, function(err, res) {
                if (err) {
                    return done(err);
                }
                JSON.stringify(res.logs).should.containEql('Unable to load resource')
                done()
            });
        });

        it('should allow local files when allowLocalFilesAccess', function(done) {
            conversion({
                allowLocalFilesAccess: true,
                html: '<script>document.write(window.location="' + __filename.replace(/\\/g, '/') + '")</script>',
            }, function(err, res) {
                if (err) {
                    return done(err);
                }
                JSON.stringify(res.logs).should.not.containEql('Unable to load resource')
                done()
            });
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