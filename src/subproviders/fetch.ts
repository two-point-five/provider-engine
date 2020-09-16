import { JsonRpcEngineMiddlewareSubprovider as ProviderSubprovider } from './json-rpc-engine-middleware';
import { createFetchMiddleware } from 'eth-json-rpc-middleware/fetch';

export default class FetchSubprovider extends ProviderSubprovider {
  constructor(opts?) {
    super(() => {
      return createFetchMiddleware(opts);
    });
  }
}
