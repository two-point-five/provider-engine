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
var clone_1 = require("clone");
var rpc_cache_utils_1 = require("../util/rpc-cache-utils");
var subprovider_1 = require("./subprovider");
var InflightCacheSubprovider = /** @class */ (function (_super) {
    __extends(InflightCacheSubprovider, _super);
    function InflightCacheSubprovider() {
        var _this = _super.call(this) || this;
        _this.inflightRequests = {};
        return _this;
    }
    InflightCacheSubprovider.prototype.handleRequest = function (req, next, end) {
        var _this = this;
        var cacheId = rpc_cache_utils_1.cacheIdentifierForPayload(req, { includeBlockRef: true });
        // if not cacheable, skip
        if (!cacheId) {
            return next();
        }
        // check for matching requests
        var activeRequestHandlers = this.inflightRequests[cacheId];
        if (!activeRequestHandlers) {
            // create inflight cache for cacheId
            activeRequestHandlers = [];
            this.inflightRequests[cacheId] = activeRequestHandlers;
            next(function (err, result, cb) {
                // complete inflight for cacheId
                delete _this.inflightRequests[cacheId];
                activeRequestHandlers.forEach(function (handler) { return handler(err, clone_1.default(result)); });
                cb(err, clone_1.default(result));
            });
        }
        else {
            // hit inflight cache for cacheId
            // setup the response listener
            activeRequestHandlers.push(end);
        }
    };
    return InflightCacheSubprovider;
}(subprovider_1.default));
exports.default = InflightCacheSubprovider;
