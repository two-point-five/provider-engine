import { EventEmitter } from 'events';
import Web3ProviderEngine from '../index';
import { createPayload } from '../util/create-payload';

// this is the base class for a subprovider -- mostly helpers
export default abstract class Subprovider extends EventEmitter {

  protected engine: Web3ProviderEngine;
  protected currentBlock: any;

  constructor() {
    super();
  }

  public setEngine(engine) {
    this.engine = engine;
    engine.on('block', (block) => {
      this.currentBlock = block;
    });
  }

  public abstract handleRequest(payload, next, end): void;

  public emitPayload(payload, cb) {
    this.engine.sendAsync(createPayload(payload), cb);
  }
}
