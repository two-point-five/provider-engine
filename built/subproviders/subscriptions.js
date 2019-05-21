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
var eth_util_1 = require("../util/eth-util");
var rpc_hex_encoding_1 = require("../util/rpc-hex-encoding");
var filters_1 = require("./filters");
var SubscriptionSubprovider = /** @class */ (function (_super) {
    __extends(SubscriptionSubprovider, _super);
    function SubscriptionSubprovider(opts) {
        var _this = _super.call(this, opts) || this;
        _this.subscriptions = {};
        return _this;
    }
    SubscriptionSubprovider.prototype.handleRequest = function (payload, next, end) {
        switch (payload.method) {
            case 'eth_subscribe':
                this.eth_subscribe(payload, end);
                break;
            case 'eth_unsubscribe':
                this.eth_unsubscribe(payload, end);
                break;
            default:
                _super.prototype.handleRequest.call(this, payload, next, end);
        }
    };
    SubscriptionSubprovider.prototype.eth_subscribe = function (payload, cb) {
        var _this = this;
        var subscriptionType = payload.params[0];
        var callback = function (err, hexId) {
            if (err) {
                return cb(err);
            }
            var id = parseInt(hexId, 16);
            _this.subscriptions[id] = subscriptionType;
            _this.filters[id].on('data', function (results) {
                if (!Array.isArray(results)) {
                    results = [results];
                }
                results.forEach(function (r) { return _this._notificationHandler(hexId, subscriptionType, r); });
                _this.filters[id].clearChanges();
            });
            if (subscriptionType === 'newPendingTransactions') {
                _this.checkForPendingBlocks();
            }
            cb(null, hexId);
        };
        switch (subscriptionType) {
            case 'logs':
                var options = payload.params[1];
                this.newLogFilter(options, callback);
                break;
            case 'newPendingTransactions':
                this.newPendingTransactionFilter(callback);
                break;
            case 'newHeads':
                this.newBlockFilter(callback);
                break;
            case 'syncing':
            default:
                cb(new Error('unsupported subscription type'));
                return;
        }
    };
    SubscriptionSubprovider.prototype.eth_unsubscribe = function (payload, cb) {
        var _this = this;
        var hexId = payload.params[0];
        var id = parseInt(hexId, 16);
        if (!this.subscriptions[id]) {
            cb(new Error("Subscription ID " + hexId + " not found."));
        }
        else {
            this.uninstallFilter(hexId, function (err, result) {
                delete _this.subscriptions[id];
                cb(err, result);
            });
        }
    };
    SubscriptionSubprovider.prototype._notificationHandler = function (hexId, subscriptionType, result) {
        if (subscriptionType === 'newHeads') {
            result = this._notificationResultFromBlock(result);
        }
        // it seems that web3 doesn't expect there to be a separate error event
        // so we must emit null along with the result object
        this.emit('data', null, {
            jsonrpc: '2.0',
            method: 'eth_subscription',
            params: {
                subscription: hexId,
                result: result,
            },
        });
    };
    SubscriptionSubprovider.prototype._notificationResultFromBlock = function (block) {
        return {
            hash: eth_util_1.bufferToHex(block.hash),
            parentHash: eth_util_1.bufferToHex(block.parentHash),
            sha3Uncles: eth_util_1.bufferToHex(block.sha3Uncles),
            miner: eth_util_1.bufferToHex(block.miner),
            stateRoot: eth_util_1.bufferToHex(block.stateRoot),
            transactionsRoot: eth_util_1.bufferToHex(block.transactionsRoot),
            receiptsRoot: eth_util_1.bufferToHex(block.receiptsRoot),
            logsBloom: eth_util_1.bufferToHex(block.logsBloom),
            difficulty: rpc_hex_encoding_1.bufferToQuantityHex(block.difficulty),
            number: rpc_hex_encoding_1.bufferToQuantityHex(block.number),
            gasLimit: rpc_hex_encoding_1.bufferToQuantityHex(block.gasLimit),
            gasUsed: rpc_hex_encoding_1.bufferToQuantityHex(block.gasUsed),
            nonce: block.nonce ? eth_util_1.bufferToHex(block.nonce) : null,
            mixHash: eth_util_1.bufferToHex(block.mixHash),
            timestamp: rpc_hex_encoding_1.bufferToQuantityHex(block.timestamp),
            extraData: eth_util_1.bufferToHex(block.extraData),
        };
    };
    return SubscriptionSubprovider;
}(filters_1.default));
exports.default = SubscriptionSubprovider;
