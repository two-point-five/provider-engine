import { EventEmitter } from 'events';
import { JSONRPCRequest, JSONRPCResponseHandler } from '.';
import { default as Web3ProviderEngine } from './provider-engine';
import { createPayload } from './util/create-payload';

// Call this type to fallthrough to the next subprovider.
// Provide a callback to receive the result when the request is complete.
export type NextHandler = (cb?: SubproviderNextCallback) => void;

// Call this to handle the request with either an error or a result.
export type CompletionHandler = (error: Error | null, result?: any) => void;

// This will be called when the request is eventually handled.
// Make sure to call the provided callback when done handling the request.
export type SubproviderNextCallback = (error: Error | null, result: any, callback: () => void) => void;

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

  // The primary method to implement
  public abstract handleRequest(payload: JSONRPCRequest, next: NextHandler, end: CompletionHandler): void;

  public emitPayload(payload: JSONRPCRequest, cb: JSONRPCResponseHandler) {
    this.engine.sendAsync(createPayload(payload), cb);
  }
}
