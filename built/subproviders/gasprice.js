"use strict";
/*
 * Calculate gasPrice based on last blocks.
 * @author github.com/axic
 *
 * FIXME: support minimum suggested gas and perhaps other options from geth:
 * https://github.com/ethereum/go-ethereum/blob/master/eth/gasprice.go
 * https://github.com/ethereum/go-ethereum/wiki/Gas-Price-Oracle
 */
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
var map_1 = require("async/map");
var subprovider_1 = require("./subprovider");
var GaspriceProvider = /** @class */ (function (_super) {
    __extends(GaspriceProvider, _super);
    function GaspriceProvider(opts) {
        var _this = this;
        opts = opts || {};
        _this = _super.call(this) || this;
        _this.numberOfBlocks = opts.numberOfBlocks || 10;
        _this.delayInBlocks = opts.delayInBlocks || 5;
        return _this;
    }
    GaspriceProvider.prototype.handleRequest = function (payload, next, end) {
        var _this = this;
        if (payload.method !== 'eth_gasPrice') {
            return next();
        }
        this.emitPayload({ method: 'eth_blockNumber' }, function (_, res) {
            // FIXME: convert number using a bignum library
            var lastBlock = parseInt(res.result, 16) - _this.delayInBlocks;
            var blockNumbers = [];
            for (var i = 0; i < _this.numberOfBlocks; i++) {
                blockNumbers.push('0x' + lastBlock.toString(16));
                lastBlock--;
            }
            var getBlock = function (item, cb) {
                _this.emitPayload({ method: 'eth_getBlockByNumber', params: [item, true] }, function (err, blockRes) {
                    if (err) {
                        return cb(err);
                    }
                    if (!blockRes.result) {
                        return cb(new Error("GaspriceProvider - No block for \"" + item + "\""));
                    }
                    cb(null, blockRes.result.transactions);
                });
            };
            // FIXME: this could be made much faster
            var calcPrice = function (err, transactions) {
                // flatten array
                transactions = transactions.reduce(function (a, b) { return a.concat(b); }, []);
                // leave only the gasprice
                // FIXME: convert number using a bignum library
                transactions = transactions.map(function (a) { return parseInt(a.gasPrice, 16); }, []);
                // order ascending
                transactions.sort(function (a, b) { return a - b; });
                // ze median
                var half = Math.floor(transactions.length / 2);
                var median;
                if (transactions.length % 2) {
                    median = transactions[half];
                }
                else {
                    median = Math.floor((transactions[half - 1] + transactions[half]) / 2.0);
                }
                end(null, median);
            };
            map_1.default(blockNumbers, getBlock, calcPrice);
        });
    };
    return GaspriceProvider;
}(subprovider_1.default));
exports.default = GaspriceProvider;
