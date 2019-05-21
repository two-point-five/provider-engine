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
var ethereumjs_tx_1 = require("ethereumjs-tx");
var ethUtil = require("../util/eth-util.js");
var subprovider_js_1 = require("./subprovider.js");
var rpc_cache_utils_1 = require("../util/rpc-cache-utils");
// handles the following RPC methods:
//   eth_getTransactionCount (pending only)
// observes the following RPC methods:
//   eth_sendRawTransaction
var NonceTrackerSubprovider = /** @class */ (function (_super) {
    __extends(NonceTrackerSubprovider, _super);
    function NonceTrackerSubprovider(opts) {
        var _this = _super.call(this, opts) || this;
        var self = _this;
        self.nonceCache = {};
        return _this;
    }
    NonceTrackerSubprovider.prototype.handleRequest = function (payload, next, end) {
        var self = this;
        switch (payload.method) {
            case 'eth_getTransactionCount':
                var blockTag = rpc_cache_utils_1.blockTagForPayload(payload);
                var address = payload.params[0].toLowerCase();
                var cachedResult = self.nonceCache[address];
                // only handle requests against the 'pending' blockTag
                if (blockTag === 'pending') {
                    // has a result
                    if (cachedResult) {
                        end(null, cachedResult);
                        // fallthrough then populate cache
                    }
                    else {
                        next(function (err, result, cb) {
                            if (err)
                                return cb();
                            if (self.nonceCache[address] === undefined) {
                                self.nonceCache[address] = result;
                            }
                            cb();
                        });
                    }
                }
                else {
                    next();
                }
                return;
            case 'eth_sendRawTransaction':
                // allow the request to continue normally
                next(function (err, result, cb) {
                    // only update local nonce if tx was submitted correctly
                    if (err)
                        return cb();
                    // parse raw tx
                    var rawTx = payload.params[0];
                    var stripped = ethUtil.stripHexPrefix(rawTx);
                    var rawData = new Buffer(ethUtil.stripHexPrefix(rawTx), 'hex');
                    var tx = new ethereumjs_tx_1.default(new Buffer(ethUtil.stripHexPrefix(rawTx), 'hex'));
                    // extract address
                    var address = '0x' + tx.getSenderAddress().toString('hex').toLowerCase();
                    // extract nonce and increment
                    var nonce = ethUtil.bufferToInt(tx.nonce);
                    nonce++;
                    // hexify and normalize
                    var hexNonce = nonce.toString(16);
                    if (hexNonce.length % 2)
                        hexNonce = '0' + hexNonce;
                    hexNonce = '0x' + hexNonce;
                    // dont update our record on the nonce until the submit was successful
                    // update cache
                    self.nonceCache[address] = hexNonce;
                    cb();
                });
                return;
            default:
                next();
                return;
        }
    };
    return NonceTrackerSubprovider;
}(subprovider_js_1.default));
exports.default = NonceTrackerSubprovider;
