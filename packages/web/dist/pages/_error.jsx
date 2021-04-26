"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Error = function (_a) {
    var statusCode = _a.statusCode;
    return (<p>
      {statusCode
            ? "An error " + statusCode + " occurred on server"
            : "An error occurred on client"}
    </p>);
};
Error.getInitialProps = function (_a) {
    var res = _a.res, err = _a.err;
    var statusCode = res ? res.statusCode : err ? err.statusCode : 404;
    return { statusCode: statusCode };
};
exports.default = Error;
