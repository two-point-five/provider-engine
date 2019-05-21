"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var asyncify_1 = require("async/asyncify");
var retry_1 = require("async/retry");
var waterfall_1 = require("async/waterfall");
var cross_fetch_1 = require("cross-fetch");
var json_rpc_error_1 = require("json-rpc-error");
var promise_to_callback_1 = require("promise-to-callback");
var create_payload_1 = require("../util/create-payload");
var subprovider_1 = require("./subprovider");
var RETRIABLE_ERRORS = [
    // ignore server overload errors
    'Gateway timeout',
    'ETIMEDOUT',
    // ignore server sent html error pages
    // or truncated json responses
    'SyntaxError',
];
var RpcSource = /** @class */ (function (_super) {
    __extends(RpcSource, _super);
    function RpcSource(opts) {
        var _this = _super.call(this) || this;
        _this.rpcUrl = opts.rpcUrl;
        _this.originHttpHeaderKey = opts.originHttpHeaderKey;
        return _this;
    }
    RpcSource.prototype.handleRequest = function (payload, next, end) {
        var _this = this;
        var originDomain = payload.origin;
        // overwrite id to not conflict with other concurrent users
        var newPayload = create_payload_1.createPayload(payload);
        // remove extra parameter from request
        delete newPayload.origin;
        var reqParams = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newPayload),
        };
        if (this.originHttpHeaderKey && originDomain) {
            reqParams.headers[this.originHttpHeaderKey] = originDomain;
        }
        retry_1.default({
            times: 5,
            interval: 1000,
            errorFilter: isErrorRetriable,
        }, function (cb) { return _this._submitRequest(reqParams, cb); }, function (err, result) {
            // ends on retriable error
            if (err && isErrorRetriable(err)) {
                var errMsg = "FetchSubprovider - cannot complete request. All retries exhausted.\nOriginal Error:\n" + err.toString() + "\n\n";
                var retriesExhaustedErr = new Error(errMsg);
                return end(retriesExhaustedErr);
            }
            // otherwise continue normally
            return end(err, result);
        });
    };
    RpcSource.prototype._submitRequest = function (reqParams, done) {
        var targetUrl = this.rpcUrl;
        promise_to_callback_1.default(cross_fetch_1.default(targetUrl, reqParams))(function (err, res) {
            if (err) {
                return done(err);
            }
            // continue parsing result
            waterfall_1.default([
                checkForHttpErrors,
                // buffer body
                function (cb) { return promise_to_callback_1.default(res.text())(cb); },
                // parse body
                asyncify_1.default(function (rawBody) { return JSON.parse(rawBody); }),
                parseResponse,
            ], done);
            function checkForHttpErrors(cb) {
                // check for errors
                switch (res.status) {
                    case 405:
                        return cb(new json_rpc_error_1.default.MethodNotFound());
                    case 418:
                        return cb(createRatelimitError());
                    case 503:
                    case 504:
                        return cb(createTimeoutError());
                    default:
                        return cb();
                }
            }
            function parseResponse(body, cb) {
                // check for error code
                if (res.status !== 200) {
                    return cb(new json_rpc_error_1.default.InternalError(body));
                }
                // check for rpc error
                if (body.error) {
                    return cb(new json_rpc_error_1.default.InternalError(body.error));
                }
                // return successful result
                cb(null, body.result);
            }
        });
    };
    return RpcSource;
}(subprovider_1.default));
exports.default = RpcSource;
function isErrorRetriable(err) {
    var errMsg = err.toString();
    return RETRIABLE_ERRORS.some(function (phrase) { return errMsg.includes(phrase); });
}
function createRatelimitError() {
    var msg = "Request is being rate limited.";
    var err = new Error(msg);
    return new json_rpc_error_1.default.InternalError(err);
}
function createTimeoutError() {
    var msg = "Gateway timeout. The request took too long to process. ";
    msg += "This can happen when querying logs over too wide a block range.";
    var err = new Error(msg);
    return new json_rpc_error_1.default.InternalError(err);
}
