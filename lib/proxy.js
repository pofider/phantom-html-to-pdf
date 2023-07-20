const http = require('http');
const https = require('https');
const { pipeline } = require('stream');

module.exports = (done) => {
    const server = http.createServer((req, res) => {            
        const urlToProxy = encodeURI(req.url.replace('/?url=', ''));             

        const proxyReq = https.request(urlToProxy, (r) => {          
          for (const h in r.headers) {
            res.setHeader(h, r.headers[h]);            
          }
  
          pipeline(r, res, (err) => {
            if (err) {
              res.statusCode = 500;
              res.statusMessage = err.message;
              res.end();
            }
          })          
        });  
        proxyReq.once('error', (err) => {
          res.statusCode = 500;
          res.statusMessage = err.message;
          res.end();
        })     
        proxyReq.end();
    });

    server.listen(0, 'localhost', (err) => {
        if (err) {
            return done(err);
        }

        done(null, server);
    })
}