"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xtend_1 = require("xtend");
var random_id_js_1 = require("./random-id.js");
function createPayload(data) {
    return xtend_1.default({
        // defaults
        id: random_id_js_1.createRandomId(),
        jsonrpc: '2.0',
        params: [],
    }, data);
}
exports.createPayload = createPayload;
