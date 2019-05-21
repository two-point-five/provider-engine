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
var events_1 = require("events");
var create_payload_1 = require("../util/create-payload");
// this is the base class for a subprovider -- mostly helpers
var Subprovider = /** @class */ (function (_super) {
    __extends(Subprovider, _super);
    function Subprovider() {
        return _super.call(this) || this;
    }
    Subprovider.prototype.setEngine = function (engine) {
        var _this = this;
        this.engine = engine;
        engine.on('block', function (block) {
            _this.currentBlock = block;
        });
    };
    Subprovider.prototype.emitPayload = function (payload, cb) {
        this.engine.sendAsync(create_payload_1.createPayload(payload), cb);
    };
    return Subprovider;
}(events_1.EventEmitter));
exports.default = Subprovider;
