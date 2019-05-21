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
var subprovider_js_1 = require("./subprovider.js");
// wraps a provider in a subprovider interface
var ProviderSubprovider = /** @class */ (function (_super) {
    __extends(ProviderSubprovider, _super);
    function ProviderSubprovider(provider) {
        var _this = _super.call(this) || this;
        _this.provider = provider;
        return _this;
    }
    ProviderSubprovider.prototype.handleRequest = function (payload, next, end) {
        this.provider.sendAsync(payload, function (err, response) {
            if (err) {
                return end(err);
            }
            if (response.error) {
                return end(new Error(response.error.message));
            }
            end(null, response.result);
        });
    };
    return ProviderSubprovider;
}(subprovider_js_1.default));
exports.default = ProviderSubprovider;
