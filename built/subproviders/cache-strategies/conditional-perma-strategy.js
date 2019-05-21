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
var cache_strategy_1 = require("./cache-strategy");
var perma_cache_strategy_1 = require("./perma-cache-strategy");
//
// ConditionalPermaCacheStrategy
//
var ConditionalPermaCacheStrategy = /** @class */ (function (_super) {
    __extends(ConditionalPermaCacheStrategy, _super);
    function ConditionalPermaCacheStrategy(conditionals) {
        var _this = _super.call(this) || this;
        _this.strategy = new perma_cache_strategy_1.default();
        _this.conditionals = conditionals;
        return _this;
    }
    ConditionalPermaCacheStrategy.prototype.hitCheck = function (payload, requestedBlockNumber, hit, miss) {
        return this.strategy.hitCheck(payload, requestedBlockNumber, hit, miss);
    };
    ConditionalPermaCacheStrategy.prototype.cacheResult = function (payload, result, requestedBlockNumber, callback) {
        var conditional = this.conditionals[payload.method];
        if (conditional) {
            if (conditional(result)) {
                this.strategy.cacheResult(payload, result, requestedBlockNumber, callback);
            }
            else {
                callback();
            }
        }
        else {
            // Cache all requests that don't have a conditional
            this.strategy.cacheResult(payload, result, requestedBlockNumber, callback);
        }
    };
    ConditionalPermaCacheStrategy.prototype.canCache = function (payload) {
        return this.strategy.canCache(payload);
    };
    return ConditionalPermaCacheStrategy;
}(cache_strategy_1.default));
exports.default = ConditionalPermaCacheStrategy;
