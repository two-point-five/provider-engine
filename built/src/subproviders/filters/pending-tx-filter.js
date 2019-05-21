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
var filter_1 = require("./filter");
//
// PendingTxFilter
//
var PendingTransactionFilter = /** @class */ (function (_super) {
    __extends(PendingTransactionFilter, _super);
    function PendingTransactionFilter() {
        var _this = 
        // console.log('PendingTransactionFilter - new')
        _super.call(this) || this;
        _this.type = 'pendingTx';
        _this.updates = [];
        _this.allResults = [];
        return _this;
    }
    PendingTransactionFilter.prototype.update = function (txs) {
        var _this = this;
        // console.log('PendingTransactionFilter - update')
        var validTxs = [];
        txs.forEach(function (tx) {
            // validate filter match
            var validated = _this.validateUnique(tx);
            if (!validated) {
                return;
            }
            // add to results
            validTxs.push(tx);
            _this.updates.push(tx);
            _this.allResults.push(tx);
        });
        if (validTxs.length > 0) {
            this.emit('data', validTxs);
        }
    };
    PendingTransactionFilter.prototype.getChanges = function () {
        // console.log('PendingTransactionFilter - getChanges')
        return this.updates;
    };
    PendingTransactionFilter.prototype.getAllResults = function () {
        // console.log('PendingTransactionFilter - getAllResults')
        return this.allResults;
    };
    PendingTransactionFilter.prototype.clearChanges = function () {
        // console.log('PendingTransactionFilter - clearChanges')
        this.updates = [];
    };
    PendingTransactionFilter.prototype.validateUnique = function (tx) {
        return this.allResults.indexOf(tx) === -1;
    };
    return PendingTransactionFilter;
}(filter_1.default));
exports.default = PendingTransactionFilter;
