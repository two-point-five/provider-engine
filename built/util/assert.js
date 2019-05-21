"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function assert(condition, message) {
    if (!condition) {
        throw message || 'Assertion failed';
    }
}
exports.assert = assert;
