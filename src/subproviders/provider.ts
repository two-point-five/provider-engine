import Subprovider from './subprovider';
import { JSONRPCRequest } from '../provider-engine';

interface Provider {
  sendAsync(payload: any, callback: (err, response) => void);
}

// wraps a provider in a subprovider interface
export default class ProviderSubprovider extends Subprovider {

  protected provider: Provider;

  constructor(provider: Provider) {
    super();
    this.provider = provider;
  }

  public handleRequest(
    payload: JSONRPCRequest,
    next: (cb?) => void,
    end: (error: Error | null, result?: any) => void,
  ) {
    this.provider.sendAsync(payload, (err, response) => {
      if (err) { return end(err); }
      if (response.error) { return end(new Error(response.error.message)); }
      end(null, response.result);
    });
  }
}
