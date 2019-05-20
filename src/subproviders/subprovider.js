import { createPayload } from '../util/create-payload.js';
import { EventEmitter } from 'events';

// this is the base class for a subprovider -- mostly helpers
export default class Subprovider extends EventEmitter {

  constructor() {
    super(...arguments);
  }

  setEngine(engine) {
    const self = this;
    self.engine = engine;
    engine.on('block', function(block) {
      self.currentBlock = block;
    });
  }

  handleRequest(payload, next, end) {
    throw new Error('Subproviders should override `handleRequest`.');
  }

  emitPayload(payload, cb) {
    const self = this;
    self.engine.sendAsync(createPayload(payload), cb);
  }
}
