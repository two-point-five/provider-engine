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
var eachSeries = require("async/eachSeries");
var map_1 = require("async/map");
var PollingBlockTracker = require("eth-block-tracker");
var events_1 = require("events");
var create_payload_1 = require("./util/create-payload");
var eth_util_1 = require("./util/eth-util");
var stoplight_1 = require("./util/stoplight");
var Web3ProviderEngine = /** @class */ (function (_super) {
    __extends(Web3ProviderEngine, _super);
    function Web3ProviderEngine(opts) {
        var _this = _super.call(this) || this;
        _this.setMaxListeners(30);
        // parse options
        opts = opts || {};
        // block polling
        var directProvider = {
            sendAsync: function (payload, callback) {
                payload.skipCache = true;
                _this._handleAsync(payload, callback);
            },
        };
        var blockTrackerProvider = opts.blockTrackerProvider || directProvider;
        _this._blockTracker = opts.blockTracker || new PollingBlockTracker({
            provider: blockTrackerProvider,
            pollingInterval: opts.pollingInterval || 4000,
        });
        // set initialization blocker
        _this._ready = new stoplight_1.default();
        // local state
        _this.currentBlock = null;
        _this._providers = [];
        return _this;
    }
    Web3ProviderEngine.prototype.start = function () {
        var _this = this;
        // handle new block
        this._blockTracker.on('latest', function (blockNumber) {
            _this._setCurrentBlockNumber(blockNumber);
        });
        // emit block events from the block tracker
        this._blockTracker.on('sync', this.emit.bind(this, 'sync'));
        this._blockTracker.on('latest', this.emit.bind(this, 'latest'));
        // unblock initialization after first block
        this._blockTracker.once('latest', function () {
            _this._ready.go();
        });
    };
    Web3ProviderEngine.prototype.stop = function () {
        // stop block polling
        this._blockTracker.removeAllListeners();
    };
    Web3ProviderEngine.prototype.addProvider = function (source) {
        this._providers.push(source);
        source.setEngine(this);
    };
    Web3ProviderEngine.prototype.send = function (payload) {
        throw new Error('Web3ProviderEngine does not support synchronous requests.');
    };
    Web3ProviderEngine.prototype.sendAsync = function (payload, cb) {
        var _this = this;
        this._ready.await(function () {
            if (Array.isArray(payload)) {
                // handle batch
                map_1.default(payload, _this._handleAsync.bind(_this), cb);
            }
            else {
                // handle single
                _this._handleAsync(payload, cb);
            }
        });
    };
    Web3ProviderEngine.prototype._handleAsync = function (payload, finished) {
        var _this = this;
        var currentProvider = -1;
        var result = null;
        var error = null;
        var stack = [];
        var next = function (after) {
            currentProvider += 1;
            stack.unshift(after);
            // Bubbled down as far as we could go, and the request wasn't
            // handled. Return an error.
            if (currentProvider >= _this._providers.length) {
                // tslint:disable-next-line: max-line-length
                var msg = "Request for method \"" + payload.method + "\" not handled by any subprovider. Please check your subprovider configuration to ensure this method is handled.";
                end(new Error(msg));
            }
            else {
                try {
                    var provider = _this._providers[currentProvider];
                    provider.handleRequest(payload, next, end);
                }
                catch (e) {
                    end(e);
                }
            }
        };
        var end = function (_error, _result) {
            if (_result === void 0) { _result = undefined; }
            error = _error;
            result = _result;
            eachSeries(stack, function (fn, callback) {
                if (fn) {
                    fn(error, result, callback);
                }
                else {
                    callback();
                }
            }, function () {
                // console.log('COMPLETED:', payload)
                // console.log('RESULT: ', result)
                var resultObj = {
                    id: payload.id,
                    jsonrpc: payload.jsonrpc,
                    result: result,
                };
                if (error != null) {
                    resultObj.error = {
                        message: error.stack || error.message || error,
                        code: -32000,
                    };
                    // respond with both error formats
                    finished(error, resultObj);
                }
                else {
                    finished(null, resultObj);
                }
            });
        };
        next();
    };
    // Once we detect a new block number, load the block data
    Web3ProviderEngine.prototype._setCurrentBlockNumber = function (blockNumber) {
        var self = this;
        self.currentBlockNumber = blockNumber;
        // Make sure we skip the cache for this request
        var payload = create_payload_1.createPayload({ method: 'eth_getBlockByNumber', params: [blockNumber, false], skipCache: true });
        self.sendAsync(payload, function (err, result) {
            if (err) {
                return;
            }
            var bufferBlock = toBufferBlock(result.result);
            self._setCurrentBlock(bufferBlock);
        });
    };
    Web3ProviderEngine.prototype._setCurrentBlock = function (block) {
        var self = this;
        self.currentBlock = block;
        self.emit('block', block);
    };
    return Web3ProviderEngine;
}(events_1.EventEmitter));
exports.default = Web3ProviderEngine;
// util
function toBufferBlock(jsonBlock) {
    return {
        number: eth_util_1.toBuffer(jsonBlock.number),
        hash: eth_util_1.toBuffer(jsonBlock.hash),
        parentHash: eth_util_1.toBuffer(jsonBlock.parentHash),
        nonce: eth_util_1.toBuffer(jsonBlock.nonce),
        mixHash: eth_util_1.toBuffer(jsonBlock.mixHash),
        sha3Uncles: eth_util_1.toBuffer(jsonBlock.sha3Uncles),
        logsBloom: eth_util_1.toBuffer(jsonBlock.logsBloom),
        transactionsRoot: eth_util_1.toBuffer(jsonBlock.transactionsRoot),
        stateRoot: eth_util_1.toBuffer(jsonBlock.stateRoot),
        receiptsRoot: eth_util_1.toBuffer(jsonBlock.receiptRoot || jsonBlock.receiptsRoot),
        miner: eth_util_1.toBuffer(jsonBlock.miner),
        difficulty: eth_util_1.toBuffer(jsonBlock.difficulty),
        totalDifficulty: eth_util_1.toBuffer(jsonBlock.totalDifficulty),
        size: eth_util_1.toBuffer(jsonBlock.size),
        extraData: eth_util_1.toBuffer(jsonBlock.extraData),
        gasLimit: eth_util_1.toBuffer(jsonBlock.gasLimit),
        gasUsed: eth_util_1.toBuffer(jsonBlock.gasUsed),
        timestamp: eth_util_1.toBuffer(jsonBlock.timestamp),
        transactions: jsonBlock.transactions,
    };
}
