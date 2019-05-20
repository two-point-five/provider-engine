import Subprovider from './subprovider.js';

// wraps a provider in a subprovider interface
export default class ProviderSubprovider extends Subprovider {

  constructor(provider) {
    super();
    if (!provider) throw new Error('ProviderSubprovider - no provider specified');
    if (!provider.sendAsync) throw new Error('ProviderSubprovider - specified provider does not have a sendAsync method');
    this.provider = provider;
  }

  handleRequest(payload, next, end){
    this.provider.sendAsync(payload, function(err, response) {
      if (err) return end(err);
      if (response.error) return end(new Error(response.error.message));
      end(null, response.result);
    });
  }
}
