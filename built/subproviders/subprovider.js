import { EventEmitter } from 'events';
import { createPayload } from '../util/create-payload';
// this is the base class for a subprovider -- mostly helpers
export default class Subprovider extends EventEmitter {
    constructor() {
        super();
    }
    setEngine(engine) {
        this.engine = engine;
        engine.on('block', (block) => {
            this.currentBlock = block;
        });
    }
    emitPayload(payload, cb) {
        this.engine.sendAsync(createPayload(payload), cb);
    }
}
