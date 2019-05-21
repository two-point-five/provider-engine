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
var xtend_1 = require("xtend");
var pkg = require("../../package.json");
var fixture_js_1 = require("./fixture.js");
var DefaultFixtures = /** @class */ (function (_super) {
    __extends(DefaultFixtures, _super);
    function DefaultFixtures(opts) {
        var _this = this;
        opts = opts || {};
        var responses = xtend_1.default({
            web3_clientVersion: 'ProviderEngine/v' + pkg.version + '/javascript',
            net_listening: true,
            eth_hashrate: '0x00',
            eth_mining: false,
        }, opts);
        _this = _super.call(this, responses) || this;
        return _this;
    }
    return DefaultFixtures;
}(fixture_js_1.default));
exports.default = DefaultFixtures;
