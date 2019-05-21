import Subprovider from './subprovider.js';
// wraps a provider in a subprovider interface
export default class ProviderSubprovider extends Subprovider {
    constructor(provider) {
        super();
        this.provider = provider;
    }
    handleRequest(payload, next, end) {
        this.provider.sendAsync(payload, (err, response) => {
            if (err) {
                return end(err);
            }
            if (response.error) {
                return end(new Error(response.error.message));
            }
            end(null, response.result);
        });
    }
}
