import 'dotenv/config';
import httpProxy from 'http-proxy';
import { createServer } from 'https';
import next from 'next';

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

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const ssl = {
  key: process.env.SSL_PRIVATE_KEY,
  cert: process.env.SSL_CERTIFICATE,
};

const apiPath = process.env.BASE_PATH
  ? process.env.BASE_PATH + '/graphql'
  : '/graphql';
const apiHost = process.env.API_HOST || 'https://localhost:8443/graphql';
const apiPathMatcher = new RegExp(`^${apiPath}`);
const proxyOptions = {
  ssl,
  target: apiHost,
  changeOrigin: true,
};

const httpsOptions = {
  ...ssl,
};

const apiProxy = httpProxy.createProxyServer(proxyOptions);
apiProxy.on('error', function proxyErrorHandler(err, req, res) {
  if (err) {
    return console.log(err);
  }
  const host = req.headers && req.headers.host;
  const code = err.code;

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
  res.end(`Error occured while trying to proxy: ${host}${req.url}`);
});

console.log(`Proxy created: ^${apiPath}  -> ${apiHost}`);

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    if (apiPathMatcher.test(req.url)) {
      const originalUrl = req.url;
      req.url = originalUrl.replace(apiPathMatcher, '');
      console.log(`Proxied  ${originalUrl}  -> ${apiHost}${req.url}`);
      return apiProxy.web(req, res);
    } else {
      return handle(req, res);
    }
  }).listen(3000, () => {
    console.log('> Server started on https://localhost:3000');
  });
});

// const apiProxy = httpProxy.createProxyServer(proxyOptions);
// apiProxy.on("error", function proxyErrorHandler(err:any, req, res) {
//   if (err) {
//     return console.log(err);
//   }
//   const host = req.headers && req.headers.host;
//   const code = err.code;

//   if (res.writeHead && !res.headersSent) {
//     if (/HPE_INVALID/.test(code)) {
//       res.writeHead(502);
//     } else {
//       switch (code) {
//         case "ECONNRESET":
//         case "ENOTFOUND":
//         case "ECONNREFUSED":
//         case "ETIMEDOUT":
//           res.writeHead(504);
//           break;
//         default:
//           res.writeHead(500);
//       }
//     }
//   }
//   res.end(`Error occured while trying to proxy: ${host}${req.url}`);
// });

// console.log(`Proxy created: ^${apiPath}  -> ${apiHost}`);

// app.prepare().then(() => {
//   createServer(httpsOptions, (req, res) => {
//     if (apiPathMatcher.test(req.url)) {
//       const originalUrl = req.url;
//       req.url = originalUrl.replace(apiPathMatcher, "");
//       console.log(`Proxied  ${originalUrl}  -> ${apiHost}${req.url}`);
//       return apiProxy.web(req, res);
//     } else {
//       return handle(req, res);
//     }
//   }).listen(3000, () => {
//     console.log("> Server started on https://localhost:3000");
//   });
// });
