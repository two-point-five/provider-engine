import { EventEmitter } from 'events';
import Web3ProviderEngine from '../index';
import { JSONRPCRequest, JSONRPCResponseHandler } from '../provider-engine';
import { createPayload } from '../util/create-payload';

// this is the base class for a subprovider -- mostly helpers
export default abstract class Subprovider extends EventEmitter {

  protected engine?: Web3ProviderEngine;
  protected currentBlock?: any;

  public setEngine(engine: Web3ProviderEngine) {
    this.engine = engine;
    engine.on('block', (block) => {
      this.currentBlock = block;
    });
  }

  public abstract handleRequest(
    payload: JSONRPCRequest,
    next: (cb?) => void,
    end: (error: Error | null, result?: any) => void,
  ): void;

  public emitPayload(payload: JSONRPCRequest, cb: JSONRPCResponseHandler) {
    this.engine.sendAsync(createPayload(payload), cb);
  }
}
