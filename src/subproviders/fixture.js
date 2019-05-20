import Subprovider from './subprovider.js';

export default class FixtureProvider extends Subprovider {

  constructor (staticResponses) {
    super();
    const self = this;
    staticResponses = staticResponses || {};
    self.staticResponses = staticResponses;
  }

  handleRequest(payload, next, end){
    const self = this;
    var staticResponse = self.staticResponses[payload.method];
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
