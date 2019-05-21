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
var BN = require("bn.js");
var eth_util_1 = require("../util/eth-util");
var rpc_cache_utils_1 = require("../util/rpc-cache-utils");
var stoplight_1 = require("../util/stoplight");
var block_strategy_1 = require("./cache-strategies/block-strategy");
var conditional_perma_strategy_1 = require("./cache-strategies/conditional-perma-strategy");
var subprovider_1 = require("./subprovider");
var BlockCacheProvider = /** @class */ (function (_super) {
    __extends(BlockCacheProvider, _super);
    function BlockCacheProvider(opts) {
        var _this = _super.call(this) || this;
        opts = opts || {};
        // set initialization blocker
        _this._ready = new stoplight_1.default();
        _this.strategies = {
            perma: new conditional_perma_strategy_1.default({
                eth_getTransactionByHash: containsBlockhash,
                eth_getTransactionReceipt: containsBlockhash,
            }),
            block: new block_strategy_1.default(),
            fork: new block_strategy_1.default(),
        };
        return _this;
    }
    // setup a block listener on 'setEngine'
    BlockCacheProvider.prototype.setEngine = function (engine) {
        var _this = this;
        this.engine = engine;
        var clearOldCache = function (newBlock) {
            var previousBlock = _this.currentBlock;
            _this.currentBlock = newBlock;
            if (!previousBlock) {
                return;
            }
            _this.strategies.block.cacheRollOff(previousBlock);
            _this.strategies.fork.cacheRollOff(previousBlock);
        };
        // unblock initialization after first block
        engine.once('block', function (block) {
            _this.currentBlock = block;
            _this._ready.go();
            // from now on, empty old cache every block
            engine.on('block', clearOldCache);
        });
    };
    BlockCacheProvider.prototype.handleRequest = function (payload, next, end) {
        var _this = this;
        // skip cache if told to do so
        if (payload.skipCache) {
            // console.log('CACHE SKIP - skip cache if told to do so')
            return next();
        }
        // Ignore requests for the latest block
        if (payload.method === 'eth_getBlockByNumber' && payload.params[0] === 'latest') {
            // console.log('CACHE SKIP - Ignore block polling requests.')
            return next();
        }
        // wait for first block
        this._ready.await(function () {
            // actually handle the request
            _this._handleRequest(payload, next, end);
        });
    };
    BlockCacheProvider.prototype._handleRequest = function (payload, next, end) {
        var type = rpc_cache_utils_1.cacheTypeForPayload(payload);
        var strategy = this.strategies[type];
        // If there's no strategy in place, pass it down the chain.
        if (!strategy) {
            return next();
        }
        // If the strategy can't cache this request, ignore it.
        if (!strategy.canCache(payload)) {
            return next();
        }
        var blockTag = rpc_cache_utils_1.blockTagForPayload(payload);
        if (!blockTag) {
            blockTag = 'latest';
        }
        var requestedBlockNumber;
        if (blockTag === 'earliest') {
            requestedBlockNumber = '0x00';
        }
        else if (blockTag === 'latest') {
            requestedBlockNumber = eth_util_1.bufferToHex(this.currentBlock.number);
        }
        else {
            // We have a hex number
            requestedBlockNumber = blockTag;
        }
        // console.log('REQUEST at block 0x' + requestedBlockNumber.toString('hex'))
        // end on a hit, continue on a miss
        strategy.hitCheck(payload, requestedBlockNumber, end, function () {
            // miss fallthrough to provider chain, caching the result on the way back up.
            next(function (err, result, cb) {
                // err is already handled by engine
                if (err) {
                    return cb();
                }
                strategy.cacheResult(payload, result, requestedBlockNumber, cb);
            });
        });
    };
    return BlockCacheProvider;
}(subprovider_1.default));
exports.default = BlockCacheProvider;
function hexToBN(hex) {
    return new BN(eth_util_1.toBuffer(hex));
}
function containsBlockhash(result) {
    if (!result) {
        return false;
    }
    if (!result.blockHash) {
        return false;
    }
    var hasNonZeroHash = hexToBN(result.blockHash).gt(new BN(0));
    return hasNonZeroHash;
}
