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
/* Sanitization Subprovider
 * For Parity compatibility
 * removes irregular keys
 */
var eth_util_1 = require("../util/eth-util");
var subprovider_1 = require("./subprovider");
var SanitizerSubprovider = /** @class */ (function (_super) {
    __extends(SanitizerSubprovider, _super);
    function SanitizerSubprovider() {
        return _super.call(this) || this;
    }
    SanitizerSubprovider.prototype.handleRequest = function (payload, next, end) {
        var txParams = payload.params[0];
        if (typeof txParams === 'object' && !Array.isArray(txParams)) {
            var sanitized = cloneTxParams(txParams);
            payload.params[0] = sanitized;
        }
        next();
    };
    return SanitizerSubprovider;
}(subprovider_1.default));
exports.default = SanitizerSubprovider;
// we use this to clean any custom params from the txParams
var permitted = [
    'from',
    'to',
    'value',
    'data',
    'gas',
    'gasPrice',
    'nonce',
    'fromBlock',
    'toBlock',
    'address',
    'topics',
];
function cloneTxParams(txParams) {
    var sanitized = permitted.reduce(function (copy, p) {
        if (p in txParams) {
            if (Array.isArray(txParams[p])) {
                copy[p] = txParams[p].map(function (item) { return sanitize(item); });
            }
            else {
                copy[p] = sanitize(txParams[p]);
            }
        }
        return copy;
    }, {});
    return sanitized;
}
function sanitize(value) {
    switch (value) {
        case 'latest':
            return value;
        case 'pending':
            return value;
        case 'earliest':
            return value;
        default:
            if (typeof value === 'string') {
                return eth_util_1.addHexPrefix(value.toLowerCase());
            }
            else {
                return value;
            }
    }
}
