import Subprovider from './subprovider';
export default class FixtureProvider extends Subprovider {
    constructor(staticResponses) {
        super();
        this.staticResponses = staticResponses || {};
    }
    handleRequest(payload, next, end) {
        const staticResponse = this.staticResponses[payload.method];
        // async function
        if ('function' === typeof staticResponse) {
            staticResponse(payload, next, end);
            // static response - null is valid response
        }
        else if (staticResponse !== undefined) {
            // return result asynchronously
            setTimeout(() => end(null, staticResponse));
            // no prepared response - skip
        }
        else {
            next();
        }
    }
}
