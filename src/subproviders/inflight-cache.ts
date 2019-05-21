import clone from 'clone';
import { cacheIdentifierForPayload } from '../util/rpc-cache-utils';
import Subprovider from './subprovider';

export default class InflightCacheSubprovider extends Subprovider {

  protected inflightRequests: any;

  constructor() {
    super();
    this.inflightRequests = {};
  }

  public handleRequest(req, next, end) {
    const cacheId = cacheIdentifierForPayload(req, { includeBlockRef: true });

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
        cb(err, clone(result));
      });

    } else {
      // hit inflight cache for cacheId
      // setup the response listener
      activeRequestHandlers.push(end);
    }
  }
}
