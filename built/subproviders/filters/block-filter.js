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
// BlockFilter
//
var BlockFilter = /** @class */ (function (_super) {
    __extends(BlockFilter, _super);
    function BlockFilter(opts) {
        var _this = 
        // console.log('BlockFilter - new')
        _super.call(this) || this;
        _this.type = 'block';
        _this.engine = opts.engine;
        _this.blockNumber = opts.blockNumber;
        _this.updates = [];
        return _this;
    }
    BlockFilter.prototype.update = function (block) {
        // console.log('BlockFilter - update')
        var blockHash = bufferToHex(block.hash);
        this.updates.push(blockHash);
        this.emit('data', block);
    };
    BlockFilter.prototype.getChanges = function () {
        // console.log('BlockFilter - getChanges:', results.length)
        return this.updates;
    };
    BlockFilter.prototype.clearChanges = function () {
        // console.log('BlockFilter - clearChanges')
        this.updates = [];
    };
    return BlockFilter;
}(filter_1.default));
exports.default = BlockFilter;
function bufferToHex(buffer) {
    return '0x' + buffer.toString('hex');
}
