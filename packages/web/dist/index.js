'use strict';
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
require('dotenv/config');
var http_proxy_1 = __importDefault(require('http-proxy'));
var https_1 = require('https');
var next_1 = __importDefault(require('next'));
if (!process.env.JWT_ACCESS_TOKEN_SECRET) {
  throw new Error('Missing JWT_ACCESS_TOKEN_SECRET');
}
if (!process.env.JWT_ACCESS_TOKEN_PUBLIC) {
  throw new Error('Missing JWT_ACCESS_TOKEN_PUBLIC');
}
if (!process.env.SSL_PRIVATE_KEY) {
  throw new Error('Missing SSL_PRIVATE_KEY');
}
if (!process.env.SSL_CERTIFICATE) {
  throw new Error('Missing SSL_PRIVATE_KEY');
}
var dev = process.env.NODE_ENV !== 'production';
var app = next_1.default({ dev: dev });
var handle = app.getRequestHandler();
var ssl = {
  key: process.env.SSL_PRIVATE_KEY,
  cert: process.env.SSL_CERTIFICATE,
};
var apiPath = process.env.BASE_PATH
  ? process.env.BASE_PATH + '/graphql'
  : '/graphql';
var apiHost = process.env.API_HOST || 'https://localhost:8443/graphql';
var apiPathMatcher = new RegExp('^' + apiPath);
var proxyOptions = {
  ssl: ssl,
  target: apiHost,
  changeOrigin: true,
};
var httpsOptions = __assign({}, ssl);
var apiProxy = http_proxy_1.default.createProxyServer(proxyOptions);
apiProxy.on('error', function proxyErrorHandler(err, req, res) {
  if (err) {
    return console.log(err);
  }
  var host = req.headers && req.headers.host;
  var code = err.code;
  if (res.writeHead && !res.headersSent) {
    if (/HPE_INVALID/.test(code)) {
      res.writeHead(502);
    } else {
      switch (code) {
        case 'ECONNRESET':
        case 'ENOTFOUND':
        case 'ECONNREFUSED':
        case 'ETIMEDOUT':
          res.writeHead(504);
          break;
        default:
          res.writeHead(500);
      }
    }
  }
  res.end('Error occured while trying to proxy: ' + host + req.url);
});
console.log('Proxy created: ^' + apiPath + '  -> ' + apiHost);
app.prepare().then(function () {
  https_1
    .createServer(httpsOptions, function (req, res) {
      if (apiPathMatcher.test(req.url)) {
        var originalUrl = req.url;
        req.url = originalUrl.replace(apiPathMatcher, '');
        console.log('Proxied  ' + originalUrl + '  -> ' + apiHost + req.url);
        return apiProxy.web(req, res);
      } else {
        return handle(req, res);
      }
    })
    .listen(3000, function () {
      console.log('> Server started on https://localhost:3000');
    });
});
