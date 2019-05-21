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
var subprovider_1 = require("./subprovider");
var FixtureProvider = /** @class */ (function (_super) {
    __extends(FixtureProvider, _super);
    function FixtureProvider(staticResponses) {
        var _this = _super.call(this) || this;
        _this.staticResponses = staticResponses || {};
        return _this;
    }
    FixtureProvider.prototype.handleRequest = function (payload, next, end) {
        var staticResponse = this.staticResponses[payload.method];
        // async function
        if ('function' === typeof staticResponse) {
            staticResponse(payload, next, end);
            // static response - null is valid response
        }
        else if (staticResponse !== undefined) {
            // return result asynchronously
            setTimeout(function () { return end(null, staticResponse); });
            // no prepared response - skip
        }
        else {
            next();
        }
    };
    return FixtureProvider;
}(subprovider_1.default));
exports.default = FixtureProvider;
