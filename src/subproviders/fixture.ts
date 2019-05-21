import { JSONRPCRequest } from '../provider-engine';
import Subprovider from './subprovider';

export default class FixtureProvider extends Subprovider {
  protected staticResponses: any;

  constructor(staticResponses) {
    super();
    this.staticResponses = staticResponses || {};
  }

  public handleRequest(
    payload: JSONRPCRequest,
    next: (cb?) => void,
    end: (error: Error | null, result?: any) => void,
  ) {
    const staticResponse = this.staticResponses[payload.method];
    // async function
    if ('function' === typeof staticResponse) {
      staticResponse(payload, next, end);
    // static response - null is valid response
    } else if (staticResponse !== undefined) {
      // return result asynchronously
      setTimeout(() => end(null, staticResponse));
    // no prepared response - skip
    } else {
      next();
    }
  }

}
