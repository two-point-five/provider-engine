import clone from 'clone';
import { JSONRPCRequest } from '../base-provider';
import Subprovider, { CompletionHandler, NextHandler } from '../subprovider';
import { cacheIdentifierForPayload } from '../util/rpc-cache-utils';

export default class InflightCacheSubprovider extends Subprovider {

  protected inflightRequests: any;

  constructor() {
    super();
    this.inflightRequests = {};
  }

  public handleRequest(payload: JSONRPCRequest, next: NextHandler, end: CompletionHandler): void {
    const cacheId = cacheIdentifierForPayload(payload, { includeBlockRef: true });

    // if not cacheable, skip
    if (!cacheId) { return next(); }

    // check for matching requests
    let activeRequestHandlers = this.inflightRequests[cacheId];

    if (!activeRequestHandlers) {
      // create inflight cache for cacheId
      activeRequestHandlers = [];
      this.inflightRequests[cacheId] = activeRequestHandlers;

      next((err, result, cb) => {
        // complete inflight for cacheId
        delete this.inflightRequests[cacheId];
        activeRequestHandlers.forEach((handler) => handler(err, clone(result)));
        result = clone(result);
        cb();
      });

    } else {
      // hit inflight cache for cacheId
      // setup the response listener
      activeRequestHandlers.push(end);
    }
  }
}
