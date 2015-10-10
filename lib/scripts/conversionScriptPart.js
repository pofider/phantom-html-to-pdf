var pageJSisDone = body.waitForJS ? false : true;

page.viewportSize = {
    width: body.viewportSize.width || 600,
    height: body.viewportSize.height || 600
};

page.settings.javascriptEnabled = body.settings.javascriptEnabled !== false;
page.settings.resourceTimeout = body.settings.resourceTimeout || 1000;

page.onResourceRequested = function (request, networkRequest) {
    if (request.url.lastIndexOf(body.url, 0) === 0) {
        return;
    }

    //potentially dangerous request
    if (request.url.lastIndexOf("file:///", 0) === 0 && !body.allowLocalFilesAccess) {
        networkRequest.abort();
        return;
    }

    //to support cdn like format //cdn.jquery...
    if (request.url.lastIndexOf("file://", 0) === 0 && request.url.lastIndexOf("file:///", 0) !== 0) {
        networkRequest.changeUrl(request.url.replace("file://", "http://"));
    }

    if (body.waitForJS && request.url.lastIndexOf("http://intruct-javascript-ending", 0) === 0) {
        pageJSisDone = true;
    }
};

page.onInitialized = function() {
    // inject function to the page in order to the client can instruct the ending of its JS
    if (body.waitForJS) {
        page.evaluate(function() {
            window.PHANTOM_HTML_TO_PDF_DONE = function() {
              var scriptNode = document.createElement("script");
              scriptNode.src = 'http://intruct-javascript-ending';
              document.body.appendChild(scriptNode);
            };
        });
    }
};

page.open(body.url, function () {
    var phantomHeader = page.evaluate(function (s) {
        return document.querySelector(s) ? document.querySelector(s).innerHTML : null;
    }, '#phantomHeader');

    var phantomFooter = page.evaluate(function (s) {
        return document.querySelector(s) ? document.querySelector(s).innerHTML : null;
    }, '#phantomFooter');

    body.numberOfPages = 0;

    page.paperSize = {
        format: body.paperSize.format || "",
        orientation: body.paperSize.orientation,
        margin: body.paperSize.margin || "1cm",
        width: body.paperSize.width || undefined,
        height: body.paperSize.height || undefined,
        header: {
            height: body.paperSize.headerHeight || ((phantomHeader || body.headerFile) ? "1cm" : "1mm"),
            contents: phantom.callback(function (pageNum, numPages) {
                body.numberOfPages = numPages;

                if (!phantomHeader && !body.headerFile)
                    return "<span></span>";

                if (!phantomHeader) {
                    var stream = fs.open(body.headerFile, "r");
                    phantomHeader = stream.read();
                    stream.close();
                }

                return phantomHeader.replace(/{#pageNum}/g, pageNum).replace(/{#numPages}/g, numPages);
            })
        },
        footer: (body.footerFile || phantomFooter) ? {
            height: body.paperSize.footerHeight || "1cm",
            contents: phantom.callback(function (pageNum, numPages) {
                if (!phantomFooter) {
                    var stream = fs.open(body.footerFile, "r");
                    phantomFooter = stream.read();
                    stream.close();
                }

                return phantomFooter.replace(/{#pageNum}/g, pageNum).replace(/{#numPages}/g, numPages);
            })
        } : undefined
    };

    if (body.customHeaders) {
        page.customHeaders = body.customHeaders;
    }

    setTimeout(function () {
        resolvePage()
    }, body.printDelay || 0);

    function resolvePage() {
        if (body.waitForJS && !pageJSisDone) {
            setTimeout(function() {
                resolvePage();
            }, 100);
            return;
        }

        page.render(body.output, body.format);
        respond(page, body);
    }
});