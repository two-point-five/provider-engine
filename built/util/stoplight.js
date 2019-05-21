import { EventEmitter } from 'events';
export default class Stoplight extends EventEmitter {
    constructor() {
        super();
        this.isLocked = true;
    }
    go() {
        this.isLocked = false;
        this.emit('unlock');
    }
    stop() {
        this.isLocked = true;
        this.emit('lock');
    }
    await(fn) {
        if (this.isLocked) {
            this.once('unlock', fn);
        }
        else {
            setTimeout(fn);
        }
    }
}
