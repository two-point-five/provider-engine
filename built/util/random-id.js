"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// gotta keep it within MAX_SAFE_INTEGER
var extraDigits = 3;
function createRandomId() {
    // 13 time digits
    var datePart = new Date().getTime() * Math.pow(10, extraDigits);
    // 3 random digits
    var extraPart = Math.floor(Math.random() * Math.pow(10, extraDigits));
    // 16 digits
    return datePart + extraPart;
}
exports.createRandomId = createRandomId;
