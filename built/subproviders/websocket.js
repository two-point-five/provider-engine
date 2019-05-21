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
var backoff_1 = require("backoff");
var subprovider_js_1 = require("./subprovider.js");
var create_payload_js_1 = require("../util/create-payload.js");
var ws_1 = require("ws");
var WebSocket = global.WebSocket || ws_1.default;
var WebsocketSubprovider = /** @class */ (function (_super) {
    __extends(WebsocketSubprovider, _super);
    function WebsocketSubprovider(_a) {
        var rpcUrl = _a.rpcUrl, debug = _a.debug, origin = _a.origin;
        var _this = _super.call(this) || this;
        Object.defineProperties(_this, {
            _backoff: {
                value: backoff_1.default.exponential({
                    randomisationFactor: 0.2,
                    maxDelay: 5000
                })
            },
            _connectTime: {
                value: null,
                writable: true
            },
            _log: {
                value: debug ? function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i] = arguments[_i];
                    }
                    return console.info.apply(console, ['[WSProvider]'].concat(args));
                } : function () { }
            },
            _origin: {
                value: origin
            },
            _pendingRequests: {
                value: new Map()
            },
            _socket: {
                value: null,
                writable: true
            },
            _unhandledRequests: {
                value: []
            },
            _url: {
                value: rpcUrl
            }
        });
        _this._handleSocketClose = _this._handleSocketClose.bind(_this);
        _this._handleSocketMessage = _this._handleSocketMessage.bind(_this);
        _this._handleSocketOpen = _this._handleSocketOpen.bind(_this);
        // Called when a backoff timeout has finished. Time to try reconnecting.
        _this._backoff.on('ready', function () {
            _this._openSocket();
        });
        _this._openSocket();
        return _this;
    }
    WebsocketSubprovider.prototype.handleRequest = function (payload, next, end) {
        if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
            this._unhandledRequests.push(Array.from(arguments));
            this._log('Socket not open. Request queued.');
            return;
        }
        this._pendingRequests.set(payload.id, [payload, end]);
        var newPayload = create_payload_js_1.createPayload(payload);
        delete newPayload.origin;
        this._socket.send(JSON.stringify(newPayload));
        this._log("Sent: " + newPayload.method + " #" + newPayload.id);
    };
    WebsocketSubprovider.prototype._handleSocketClose = function (_a) {
        var reason = _a.reason, code = _a.code;
        this._log("Socket closed, code " + code + " (" + (reason || 'no reason') + ")");
        // If the socket has been open for longer than 5 seconds, reset the backoff
        if (this._connectTime && Date.now() - this._connectTime > 5000) {
            this._backoff.reset();
        }
        this._socket.removeEventListener('close', this._handleSocketClose);
        this._socket.removeEventListener('message', this._handleSocketMessage);
        this._socket.removeEventListener('open', this._handleSocketOpen);
        this._socket = null;
        this._backoff.backoff();
    };
    WebsocketSubprovider.prototype._handleSocketMessage = function (message) {
        var payload;
        try {
            payload = JSON.parse(message.data);
        }
        catch (e) {
            this._log('Received a message that is not valid JSON:', payload);
            return;
        }
        // check if server-sent notification
        if (payload.id === undefined) {
            return this.emit('data', null, payload);
        }
        // ignore if missing
        if (!this._pendingRequests.has(payload.id)) {
            return;
        }
        // retrieve payload + arguments
        var _a = this._pendingRequests.get(payload.id), originalReq = _a[0], end = _a[1];
        this._pendingRequests.delete(payload.id);
        this._log("Received: " + originalReq.method + " #" + payload.id);
        // forward response
        if (payload.error) {
            return end(new Error(payload.error.message));
        }
        end(null, payload.result);
    };
    WebsocketSubprovider.prototype._handleSocketOpen = function () {
        var _this = this;
        this._log('Socket open.');
        this._connectTime = Date.now();
        // Any pending requests need to be resent because our session was lost
        // and will not get responses for them in our new session.
        this._pendingRequests.forEach(function (_a) {
            var payload = _a[0], end = _a[1];
            _this._unhandledRequests.push([payload, null, end]);
        });
        this._pendingRequests.clear();
        var unhandledRequests = this._unhandledRequests.splice(0, this._unhandledRequests.length);
        unhandledRequests.forEach(function (request) {
            _this.handleRequest.apply(_this, request);
        });
    };
    WebsocketSubprovider.prototype._openSocket = function () {
        this._log('Opening socket...');
        this._socket = new WebSocket(this._url, null, { origin: this._origin });
        this._socket.addEventListener('close', this._handleSocketClose);
        this._socket.addEventListener('message', this._handleSocketMessage);
        this._socket.addEventListener('open', this._handleSocketOpen);
    };
    return WebsocketSubprovider;
}(subprovider_js_1.default));
exports.default = WebsocketSubprovider;
// multiple inheritance
Object.assign(WebsocketSubprovider.prototype, EventEmitter.prototype);
