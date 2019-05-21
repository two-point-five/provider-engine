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
var clone = require("clone");
var eth_util_1 = require("../../util/eth-util");
var rpc_cache_utils_1 = require("../../util/rpc-cache-utils");
var cache_strategy_1 = require("./cache-strategy");
//
// BlockCacheStrategy
//
var BlockCacheStrategy = /** @class */ (function (_super) {
    __extends(BlockCacheStrategy, _super);
    function BlockCacheStrategy() {
        var _this = _super.call(this) || this;
        _this.cache = {};
        return _this;
    }
    BlockCacheStrategy.prototype.getBlockCacheForPayload = function (payload, blockNumberHex) {
        var blockNumber = parseInt(blockNumberHex, 16);
        var blockCache = this.cache[blockNumber];
        // create new cache if necesary
        if (!blockCache) {
            var newCache = {};
            this.cache[blockNumber] = newCache;
            blockCache = newCache;
        }
        return blockCache;
    };
    BlockCacheStrategy.prototype.hitCheck = function (payload, requestedBlockNumber, hit, miss) {
        var blockCache = this.getBlockCacheForPayload(payload, requestedBlockNumber);
        if (!blockCache) {
            return miss();
        }
        var identifier = rpc_cache_utils_1.cacheIdentifierForPayload(payload);
        var cached = blockCache[identifier];
        if (cached) {
            var clonedValue = clone(cached);
            return hit(null, clonedValue);
        }
        else {
            return miss();
        }
    };
    BlockCacheStrategy.prototype.cacheResult = function (payload, result, requestedBlockNumber, callback) {
        if (result) {
            var blockCache = this.getBlockCacheForPayload(payload, requestedBlockNumber);
            var identifier = rpc_cache_utils_1.cacheIdentifierForPayload(payload);
            var clonedValue = clone(result);
            blockCache[identifier] = clonedValue;
        }
        callback();
    };
    BlockCacheStrategy.prototype.canCache = function (payload) {
        if (!rpc_cache_utils_1.canCache(payload)) {
            return false;
        }
        var blockTag = rpc_cache_utils_1.blockTagForPayload(payload);
        return (blockTag !== 'pending');
    };
    // naively removes older block caches
    BlockCacheStrategy.prototype.cacheRollOff = function (previousBlock) {
        var _this = this;
        var previousHex = eth_util_1.bufferToHex(previousBlock.number);
        var oldBlockNumber = parseInt(previousHex, 16);
        // clear old caches
        Object.keys(this.cache)
            .map(Number)
            .filter(function (num) { return num <= oldBlockNumber; })
            .forEach(function (num) { return delete _this.cache[num]; });
    };
    return BlockCacheStrategy;
}(cache_strategy_1.default));
exports.default = BlockCacheStrategy;
