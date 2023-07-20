
# phantom-html-to-pdf
[![NPM Version](http://img.shields.io/npm/v/phantom-html-to-pdf.svg?style=flat-square)](https://npmjs.com/package/phantom-html-to-pdf)
[![License](http://img.shields.io/npm/l/phantom-html-to-pdf.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.org/pofider/phantom-html-to-pdf.png?branch=master)](https://travis-ci.org/pofider/phantom-html-to-pdf)

**The phantomjs development is on hold and as is this project. There are, and will be security issues rising! I recommend to evaluate other methods for html to pdf conversion. We have switched from phantomjs to headless chrome in [jsreport](https://jsreport.net) and it works great.**

> **node.js phantom wrapper for converting html to pdf in scale**

Yet another implementation of html to pdf conversion in node.js using phantomjs. This one differs from others in performance and scalability. Unlike others it allocates predefined number of phantomjs worker processes which are then managed and reused using FIFO strategy. This eliminates phantomjs process startup time and it also doesn't flood the system with dozens of phantomjs process under load.

```js
var fs = require('fs')
var conversion = require("phantom-html-to-pdf")();
conversion({ html: "<h1>Hello World</h1>" }, function(err, pdf) {
  var output = fs.createWriteStream('/path/to/output.pdf')
  console.log(pdf.logs);
  console.log(pdf.numberOfPages);
	// since pdf.stream is a node.js stream you can use it
	// to save the pdf to a file (like in this example) or to
	// respond an http request.
  pdf.stream.pipe(output);
});
```

## Installation troubleshooting

- **windows** works out of the box.

- **macOS sierra update** works only with phantomjs2, see below

- **linux** may need to additionally install [fontconfig](https://www.freedesktop.org/wiki/Software/fontconfig/) package
*Centos*
`sudo yum install -y fontconfig`
*Debian/Ubuntu*
`sudo apt-get install -y libfontconfig`

## Global options
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
	strategy: "phantom-server | dedicated-process",
	/* optional path to the phantomjs binary
	   NOTE: When using phantomjs 2.0, be aware of https://github.com/ariya/phantomjs/issues/12685 */
	phantomPath: "{path to phantomjs}",
	/* see phantomjs arguments for proxy setting details */
	proxy,proxy-type,proxy-auth,
	/* the collected console.log messages are trimmed by default */
	maxLogEntrySize: 1000
});
```



## Local options

```js
conversion({
	html: '<h1>Hello world</h1>',
	header: '<h2>This is the header</h2>',
	footer: '<div style="text-align:center">{#pageNum}/{#numPages}</div>',
	url: "http://jsreport.net",//set direct url instead of html
	printDelay: 0,//time in ms to wait before printing into pdf
	waitForJS: true,//set to true to enable programmatically specify (via Javascript of the page) when the pdf printing starts (see Programmatic pdf printing section for an example)
	waitForJSVarName: //name of the variable that will be used as a printing trigger, defaults to "PHANTOM_HTML_TO_PDF_READY" (see Programmatic pdf printing section for an example)
	allowLocalFilesAccess: false,//set to true to allow request starting with file:///
	// see PhantomJS options for paperSize - http://phantomjs.org/api/webpage/property/paper-size.html
	paperSize: {
		format, orientation, margin, width, height, headerHeight, footerHeight
	},
  	fitToPage: false, //whether to set zoom if contents don't fit on the page
	customHeaders: [],
        cookies: [{
                name: 'cookie-name',
                value: 'cookie-value',
                path: '/',
                domain: 'domain.com'//Leave blank when working on localhost - "." will get prepended to domain
        }],
	injectJs: [], // injects javascript files in the page
	settings: {
		javascriptEnabled : true,
		resourceTimeout: 1000
	},
	// see phantomjs docs - http://phantomjs.org/api/webpage/property/viewport-size.html
	viewportSize: {
		width: 600,
		height: 600
	},
	format: {
		quality: 100
	},
	zoomFactor: 1 // defaults to 1 (original size).
}, cb);
```

## phantomjs2
This package includes phantomjs 1.9.x distribution. If you like to rather use latest phantomjs you can provide it in the  `phantomPath` option.

Install [phantomjs-prebuilt](https://www.npmjs.com/package/phantomjs-prebuilt) and then...
```js
var conversion = require("phantom-html-to-pdf")({
	phantomPath: require("phantomjs-prebuilt").path
});

conversion({
	html: "foo"
}, function (err, res){});
```

## Kill workers
```js
//kill all phantomjs workers when using phantom-server strategy
conversion.kill();
```

## Header and footer

It is possible to specify a custom header and a custom footer using HTML.

In the header and footer there is no access to the rest of the document and thus
styling with classes and leveraging external CSS does not work. Only inline
styles works. This is a limitation on the current PhantomJS implementation.

To print page numbers, use the directives `{#pageNum}` and `{#numPages}`,
respectively to add current page number and total number of pages. For example:

```html
<div style='text-align:center'>{#pageNum}/{#numPages}</div>
```

It's also possible to use JavaScript. But note that the JavaScript code has no
access to the rest of the HTML document either. Here is an example to modify the
paging start:

```html
<span id='pageNumber'>{#pageNum}</span>
<script>
    var elem = document.getElementById('pageNumber');
    if (parseInt(elem.innerHTML) <= 3) {
        elem.style.display = 'none';
    }
</script>
```

## Programmatic pdf printing
If you need to programmatic trigger the pdf printing process (because you need to calculate some values or do something async in your page before printing) you can enable the `waitForJS` local option, when `waitForJS` is set to true the pdf printing will wait until you set a variable to true in your page, by default the name of the variable is `PHANTOM_HTML_TO_PDF_READY` but you can customize it via `waitForJSVarName` option.

**Example:**

local options:
```js
conversion({
	html: "<custom html here>",
	waitForJS: true,
	viewportSize: {
		width: 600,
		height: 600
	},
	format: {
		quality: 100
	}
}, cb);
```

custom html:
```html
<h1></h1>
<script>
	// do some calculations or something async
	setTimeout(function() {
		window.PHANTOM_HTML_TO_PDF_READY = true; //this will start the pdf printing
	}, 500);
</script>
```

## Image in header
To be able to display an image in the header or footer you need to add the same image to the main content and hide it with `style="display:none"`.

## Further notes
You may find some further information and usage examples in the [jsreport documentation](http://jsreport.net/learn/phantom-pdf) or try pdf printing in the [online playground](https://playground.jsreport.net/#/playground/xykdJcxR5).

## Warming up
The phantomjs instances are sinned up when the requests comes. This usually leads to a bit slower first requests. The pre-warmup can be easily done by calling an "empty" conversion the same number of times as the `numberOfWorkers` config.

## License
See [license](https://github.com/pofider/phantom-html-to-pdf/blob/master/LICENSE)
**strong text**
