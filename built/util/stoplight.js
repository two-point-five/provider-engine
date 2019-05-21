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
var Stoplight = /** @class */ (function (_super) {
    __extends(Stoplight, _super);
    function Stoplight() {
        var _this = _super.call(this) || this;
        _this.isLocked = true;
        return _this;
    }
    Stoplight.prototype.go = function () {
        this.isLocked = false;
        this.emit('unlock');
    };
    Stoplight.prototype.stop = function () {
        this.isLocked = true;
        this.emit('lock');
    };
    Stoplight.prototype.await = function (fn) {
        if (this.isLocked) {
            this.once('unlock', fn);
        }
        else {
            setTimeout(fn);
        }
    };
    return Stoplight;
}(events_1.EventEmitter));
exports.default = Stoplight;
