#phantom-html-to-pdf
[![NPM Version](http://img.shields.io/npm/v/phantom-html-to-pdf.svg?style=flat-square)](https://npmjs.com/package/phantom-html-to-pdf)
[![License](http://img.shields.io/npm/l/phantom-html-to-pdf.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.org/pofider/phantom-html-to-pdf.png?branch=master)](https://travis-ci.org/pofider/phantom-html-to-pdf)

> **node.js phantom wrapper for converting html to pdf in scale**

Yet another implementation of html to pdf conversion in node.js using phantomjs. This one differs from others in performance and scalability. Unlike others it allocates predefined number of phantomjs worker processes which are then managed and reused using FIFO strategy. This eliminates phantomjs process startup time and it also doesn't flood the system with dozens of phantomjs process under load.

```js
var conversion = require("phantom-html-to-pdf")();
conversion({ html: "<h1>Hello World</h1>" }, function(err, pdf) {
  console.log(pdf.numberOfPages);
  pdf.stream.pipe(res);
});
```

##Global options
```js
var conversion = require("phantom-html-to-pdf")({
    /* number of allocated phantomjs processes */
	numberOfWorkers: 2,
	/* timeout in ms for html conversion, when the timeout is reached, the phantom process is recycled */
	timeout: 5000,
	/* directory where are stored temporary html and pdf files, use something like npm package reaper to clean this up */
	tmpDir: "os/tmpdir",
	/* optional port range where to start phantomjs server */
	portLeftBoundary: 1000,
	portRightBoundary: 2000,
	/* optional hostname where to start phantomjs server */
	host: '127.0.0.1',
	/* use rather dedicated process for every phantom printing 
	  dedicated-process strategy is quite slower but can solve some bugs 
	  with corporate proxy */	
	strategy: "phantom-server | dedicated-process"
});
```

##Local options

```js
conversion({
	html: "<h1>Hello world</h1>",
	header: "<h2>foo</h2>",
	footer: "<h2>foo</h2>",
	url: "http://jsreport.net",//set direct url instead of html
	printDelay: 0,//time in ms to wait before printing into pdf
	allowLocalFilesAccess: false,//set to true to allow request starting with file:///
	paperSize: {
		format, orientation, margin, width, height, headerHeight, footerHeight
	},
	customHeaders: [],
	settings: {
		javascriptEnabled : true
	},
	viewportSize: {
		width: 600,
		height: 600
	},
	format: {
		quality: 100
	}
}, cb);
```

##License
See [license](https://github.com/pofider/phantom-html-to-pdf/blob/master/LICENSE)