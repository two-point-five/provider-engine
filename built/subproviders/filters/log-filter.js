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
// LogFilter
//
var LogFilter = /** @class */ (function (_super) {
    __extends(LogFilter, _super);
    function LogFilter(opts) {
        var _this = 
        // console.log('LogFilter - new')
        _super.call(this) || this;
        _this.type = 'log';
        _this.fromBlock = (opts.fromBlock !== undefined) ? opts.fromBlock : 'latest';
        _this.toBlock = (opts.toBlock !== undefined) ? opts.toBlock : 'latest';
        var expectedAddress = opts.address && (Array.isArray(opts.address) ? opts.address : [opts.address]);
        _this.address = expectedAddress && expectedAddress.map(normalizeHex);
        _this.topics = opts.topics || [];
        _this.updates = [];
        _this.allResults = [];
        return _this;
    }
    LogFilter.prototype.update = function (logs) {
        var _this = this;
        // console.log('LogFilter - update')
        // validate filter match
        var validLogs = [];
        logs.forEach(function (log) {
            var validated = _this.validateLog(log);
            if (!validated) {
                return;
            }
            // add to results
            validLogs.push(log);
            _this.updates.push(log);
            _this.allResults.push(log);
        });
        if (validLogs.length > 0) {
            this.emit('data', validLogs);
        }
    };
    LogFilter.prototype.getChanges = function () {
        // console.log('LogFilter - getChanges')
        return this.updates;
    };
    LogFilter.prototype.getAllResults = function () {
        // console.log('LogFilter - getAllResults')
        return this.allResults;
    };
    LogFilter.prototype.clearChanges = function () {
        // console.log('LogFilter - clearChanges')
        this.updates = [];
    };
    LogFilter.prototype.validateLog = function (log) {
        // console.log('LogFilter - validateLog:', log)
        // check if block number in bounds:
        // console.log('LogFilter - validateLog - blockNumber', this.fromBlock, this.toBlock)
        if (blockTagIsNumber(this.fromBlock) && hexToInt(this.fromBlock) >= hexToInt(log.blockNumber)) {
            return false;
        }
        if (blockTagIsNumber(this.toBlock) && hexToInt(this.toBlock) <= hexToInt(log.blockNumber)) {
            return false;
        }
        // address is correct:
        // console.log('LogFilter - validateLog - address', this.address)
        if (this.address && !(this.address.map(function (a) { return a.toLowerCase(); }).includes(log.address.toLowerCase()))) {
            return false;
        }
        // topics match:
        // topics are position-dependant
        // topics can be nested to represent `or` [[a || b], c]
        // topics can be null, representing a wild card for that position
        // console.log('LogFilter - validateLog - topics', log.topics)
        // console.log('LogFilter - validateLog - against topics', this.topics)
        var topicsMatch = this.topics.reduce(function (previousMatched, topicPattern, index) {
            // abort in progress
            if (!previousMatched) {
                return false;
            }
            // wild card
            if (!topicPattern) {
                return true;
            }
            // pattern is longer than actual topics
            var logTopic = log.topics[index];
            if (!logTopic) {
                return false;
            }
            // check each possible matching topic
            var subtopicsToMatch = Array.isArray(topicPattern) ? topicPattern : [topicPattern];
            var topicDoesMatch = subtopicsToMatch.filter(function (subTopic) {
                return logTopic.toLowerCase() === subTopic.toLowerCase();
            }).length > 0;
            return topicDoesMatch;
        }, true);
        // console.log('LogFilter - validateLog - '+(topicsMatch ? 'approved!' : 'denied!')+' ==============')
        return topicsMatch;
    };
    return LogFilter;
}(filter_1.default));
exports.default = LogFilter;
function blockTagIsNumber(blockTag) {
    return blockTag && ['earliest', 'latest', 'pending'].indexOf(blockTag) === -1;
}
function hexToInt(hexString) {
    return Number(hexString);
}
function normalizeHex(hexString) {
    return hexString.slice(0, 2) === '0x' ? hexString : '0x' + hexString;
}
