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
var async_1 = require("async");
var eth_util_1 = require("../util/eth-util");
var stoplight_1 = require("../util/stoplight");
var block_filter_1 = require("./filters/block-filter");
var log_filter_1 = require("./filters/log-filter");
var pending_tx_filter_1 = require("./filters/pending-tx-filter");
var subprovider_1 = require("./subprovider");
// handles the following RPC methods:
//   eth_newBlockFilter
//   eth_newPendingTransactionFilter
//   eth_newFilter
//   eth_getFilterChanges
//   eth_uninstallFilter
//   eth_getFilterLogs
var FilterSubprovider = /** @class */ (function (_super) {
    __extends(FilterSubprovider, _super);
    function FilterSubprovider(opts) {
        var _this = _super.call(this) || this;
        opts = opts || {};
        _this.filterIndex = 0;
        _this.filters = {};
        _this.filterDestroyHandlers = {};
        _this.asyncBlockHandlers = {};
        _this.asyncPendingBlockHandlers = {};
        _this._ready = new stoplight_1.default();
        _this._ready.setMaxListeners(opts.maxFilters || 25);
        _this._ready.go();
        _this.pendingBlockTimeout = opts.pendingBlockTimeout || 4000;
        _this.checkForPendingBlocksActive = false;
        // TODO: Actually load the blocks
        // we dont have engine immeditately
        setTimeout(function () {
            // asyncBlockHandlers require locking provider until updates are completed
            _this.engine.on('block', function (block) {
                // pause processing
                _this._ready.stop();
                // update filters
                var updaters = valuesFor(_this.asyncBlockHandlers).map(function (fn) { return fn.bind(null, block); });
                async_1.default.parallel(updaters, function (err) {
                    // tslint:disable-next-line: no-console
                    if (err) {
                        console.error(err);
                    }
                    // unpause processing
                    _this._ready.go();
                });
            });
        });
        return _this;
    }
    FilterSubprovider.prototype.handleRequest = function (payload, next, end) {
        var _this = this;
        switch (payload.method) {
            case 'eth_newBlockFilter':
                this.newBlockFilter(end);
                return;
            case 'eth_newPendingTransactionFilter':
                this.newPendingTransactionFilter(end);
                this.checkForPendingBlocks();
                return;
            case 'eth_newFilter':
                this.newLogFilter(payload.params[0], end);
                return;
            case 'eth_getFilterChanges':
                this._ready.await(function () {
                    _this.getFilterChanges(payload.params[0], end);
                });
                return;
            case 'eth_getFilterLogs':
                this._ready.await(function () {
                    _this.getFilterLogs(payload.params[0], end);
                });
                return;
            case 'eth_uninstallFilter':
                this._ready.await(function () {
                    _this.uninstallFilter(payload.params[0], end);
                });
                return;
            default:
                next();
                return;
        }
    };
    FilterSubprovider.prototype.newBlockFilter = function (cb) {
        var _this = this;
        this._getBlockNumber(function (err, blockNumber) {
            if (err) {
                return cb(err);
            }
            var filter = new block_filter_1.default({
                blockNumber: blockNumber,
            });
            var newBlockHandler = filter.update.bind(filter);
            _this.engine.on('block', newBlockHandler);
            var destroyHandler = function () {
                _this.engine.removeListener('block', newBlockHandler);
            };
            _this.filterIndex++;
            _this.filters[_this.filterIndex] = filter;
            _this.filterDestroyHandlers[_this.filterIndex] = destroyHandler;
            var hexFilterIndex = eth_util_1.intToHex(_this.filterIndex);
            cb(null, hexFilterIndex);
        });
    };
    FilterSubprovider.prototype.newLogFilter = function (opts, done) {
        var _this = this;
        this._getBlockNumber(function (error, blockNumber) {
            if (error) {
                return done(error);
            }
            var filter = new log_filter_1.default(opts);
            var newLogHandler = filter.update.bind(filter);
            var blockHandler = function (block, cb) {
                _this._logsForBlock(block, function (err, logs) {
                    if (err) {
                        return cb(err);
                    }
                    newLogHandler(logs);
                    cb();
                });
            };
            _this.filterIndex++;
            _this.asyncBlockHandlers[_this.filterIndex] = blockHandler;
            _this.filters[_this.filterIndex] = filter;
            var hexFilterIndex = eth_util_1.intToHex(_this.filterIndex);
            done(null, hexFilterIndex);
        });
    };
    FilterSubprovider.prototype.newPendingTransactionFilter = function (done) {
        var _this = this;
        var filter = new pending_tx_filter_1.default();
        var newTxHandler = filter.update.bind(filter);
        var blockHandler = function (block, cb) {
            _this._txHashesForBlock(block, function (err, txs) {
                if (err) {
                    return cb(err);
                }
                newTxHandler(txs);
                cb();
            });
        };
        this.filterIndex++;
        this.asyncPendingBlockHandlers[this.filterIndex] = blockHandler;
        this.filters[this.filterIndex] = filter;
        var hexFilterIndex = eth_util_1.intToHex(this.filterIndex);
        done(null, hexFilterIndex);
    };
    FilterSubprovider.prototype.getFilterChanges = function (hexFilterId, cb) {
        var filterId = parseInt(hexFilterId, 16);
        var filter = this.filters[filterId];
        // if (!filter) { console.warn('FilterSubprovider - no filter with that id:', hexFilterId); }
        if (!filter) {
            return cb(null, []);
        }
        var results = filter.getChanges();
        filter.clearChanges();
        cb(null, results);
    };
    FilterSubprovider.prototype.getFilterLogs = function (hexFilterId, cb) {
        var filterId = parseInt(hexFilterId, 16);
        var filter = this.filters[filterId];
        // if (!filter) { console.warn('FilterSubprovider - no filter with that id:', hexFilterId); }
        if (!filter) {
            return cb(null, []);
        }
        if (filter.type === 'log') {
            this.emitPayload({
                method: 'eth_getLogs',
                params: [{
                        fromBlock: filter.fromBlock,
                        toBlock: filter.toBlock,
                        address: filter.address,
                        topics: filter.topics,
                    }],
            }, function (err, res) {
                if (err) {
                    return cb(err);
                }
                cb(null, res.result);
            });
        }
        else {
            cb(null, []);
        }
    };
    FilterSubprovider.prototype.uninstallFilter = function (hexFilterId, cb) {
        var filterId = parseInt(hexFilterId, 16);
        var filter = this.filters[filterId];
        if (!filter) {
            cb(null, false);
            return;
        }
        this.filters[filterId].removeAllListeners();
        var destroyHandler = this.filterDestroyHandlers[filterId];
        delete this.filters[filterId];
        delete this.asyncBlockHandlers[filterId];
        delete this.asyncPendingBlockHandlers[filterId];
        delete this.filterDestroyHandlers[filterId];
        if (destroyHandler) {
            destroyHandler();
        }
        cb(null, true);
    };
    FilterSubprovider.prototype.checkForPendingBlocks = function () {
        var _this = this;
        if (this.checkForPendingBlocksActive) {
            return;
        }
        var activePendingTxFilters = !!Object.keys(this.asyncPendingBlockHandlers).length;
        if (activePendingTxFilters) {
            this.checkForPendingBlocksActive = true;
            this.emitPayload({
                method: 'eth_getBlockByNumber',
                params: ['pending', true],
            }, function (err, res) {
                if (err) {
                    _this.checkForPendingBlocksActive = false;
                    // console.error(err);
                    return;
                }
                _this.onNewPendingBlock(res.result, function () {
                    // if (err) { console.error(err); }
                    _this.checkForPendingBlocksActive = false;
                    setTimeout(_this.checkForPendingBlocks.bind(_this), _this.pendingBlockTimeout);
                });
            });
        }
    };
    FilterSubprovider.prototype.onNewPendingBlock = function (block, cb) {
        // update filters
        var updaters = valuesFor(this.asyncPendingBlockHandlers)
            .map(function (fn) { return fn.bind(null, block); });
        async_1.default.parallel(updaters, cb);
    };
    FilterSubprovider.prototype._getBlockNumber = function (cb) {
        var blockNumber = bufferToNumberHex(this.engine.currentBlock.number);
        cb(null, blockNumber);
    };
    FilterSubprovider.prototype._logsForBlock = function (block, cb) {
        var blockNumber = bufferToNumberHex(block.number);
        this.emitPayload({
            method: 'eth_getLogs',
            params: [{
                    fromBlock: blockNumber,
                    toBlock: blockNumber,
                }],
        }, function (err, response) {
            if (err) {
                return cb(err);
            }
            if (response.error) {
                return cb(response.error);
            }
            cb(null, response.result);
        });
    };
    FilterSubprovider.prototype._txHashesForBlock = function (block, cb) {
        var txs = block.transactions;
        // short circuit if empty
        if (txs.length === 0) {
            return cb(null, []);
        }
        // txs are already hashes
        if ('string' === typeof txs[0]) {
            cb(null, txs);
            // txs are obj, need to map to hashes
        }
        else {
            var results = txs.map(function (tx) { return tx.hash; });
            cb(null, results);
        }
    };
    return FilterSubprovider;
}(subprovider_1.default));
exports.default = FilterSubprovider;
// util
function bufferToNumberHex(buffer) {
    return stripLeadingZero(buffer.toString('hex'));
}
function stripLeadingZero(hexNum) {
    var stripped = eth_util_1.stripHexPrefix(hexNum);
    while (stripped[0] === '0') {
        stripped = stripped.substr(1);
    }
    return "0x" + stripped;
}
function valuesFor(obj) {
    return Object.keys(obj).map(function (key) { return obj[key]; });
}
