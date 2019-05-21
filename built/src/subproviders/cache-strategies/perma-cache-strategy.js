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
var rpc_cache_utils_1 = require("../../util/rpc-cache-utils");
var cache_strategy_1 = require("./cache-strategy");
var PermaCacheStrategy = /** @class */ (function (_super) {
    __extends(PermaCacheStrategy, _super);
    function PermaCacheStrategy() {
        var _this = _super.call(this) || this;
        _this.cache = {};
        // clear cache every ten minutes
        var timeout = setInterval(function () {
            _this.cache = {};
        }, 10 * 60 * 1e3);
        // do not require the Node.js event loop to remain active
        if (timeout.unref) {
            timeout.unref();
        }
        return _this;
    }
    PermaCacheStrategy.prototype.hitCheck = function (payload, requestedBlockNumber, hit, miss) {
        var identifier = rpc_cache_utils_1.cacheIdentifierForPayload(payload);
        var cached = this.cache[identifier];
        if (!cached) {
            return miss();
        }
        // If the block number we're requesting at is greater than or
        // equal to the block where we cached a previous response,
        // the cache is valid. If it's from earlier than the cache,
        // send it back down to the client (where it will be recached.)
        var cacheIsEarlyEnough = compareHex(requestedBlockNumber, cached.blockNumber) >= 0;
        if (cacheIsEarlyEnough) {
            var clonedValue = clone_1.default(cached.result);
            return hit(null, clonedValue);
        }
        else {
            return miss();
        }
    };
    PermaCacheStrategy.prototype.cacheResult = function (payload, result, requestedBlockNumber, callback) {
        var identifier = rpc_cache_utils_1.cacheIdentifierForPayload(payload);
        if (result) {
            var clonedValue = clone_1.default(result);
            this.cache[identifier] = {
                blockNumber: requestedBlockNumber,
                result: clonedValue,
            };
        }
        callback();
    };
    PermaCacheStrategy.prototype.canCache = function (payload) {
        return rpc_cache_utils_1.canCache(payload);
    };
    return PermaCacheStrategy;
}(cache_strategy_1.default));
exports.default = PermaCacheStrategy;
function compareHex(hexA, hexB) {
    var numA = parseInt(hexA, 16);
    var numB = parseInt(hexB, 16);
    return numA === numB ? 0 : (numA > numB ? 1 : -1);
}
