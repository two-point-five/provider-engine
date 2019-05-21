"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var extend = require("xtend");
var random_id_1 = require("./random-id");
function createPayload(data) {
    return extend({
        // defaults
        id: random_id_1.createRandomId(),
        jsonrpc: '2.0',
        params: [],
    }, data);
}
exports.createPayload = createPayload;
