import { EventEmitter } from 'events';
import { createPayload } from './util/create-payload';

export interface JSONRPCResponse {
  id: number;
  jsonrpc: string;
  error?: any;
  result?: any;
}

export interface JSONRPCRequest {
  id?: number;
  jsonrpc?: string;
  method: string;
  params: any[];
  skipCache?: boolean; // proprietary field, tells provider not to respond from cache
  origin?: any; // proprietary field, tells provider what origin value to add to http request
}

export type JSONRPCResponseHandler = (error: null | Error, response: JSONRPCResponse) => void;

// The base class which ProviderEngine will extend from that provides the basic Web3 Provider interface
export default abstract class BaseProvider extends EventEmitter {

  // Modern send method
  public send(method: string, params: any[]): Promise<any> {
    const payload = createPayload({ method, params });
    return this.sendPayload(payload);
  }

  // Legacy sendAsync method
  public sendAsync(payload: JSONRPCRequest, cb: JSONRPCResponseHandler) {
    this.sendPayload(payload).then((response) => {
      cb(null, response);
    }).catch((error) => {
      cb(error, null);
    });
  }

  // Whether or not this provider supports subscriptions
  public supportsSubscriptions(): boolean {
    // Override this in your subclass if you support subscriptions
    return false;
  }

  // Method to subscribe to a given subscription type
  public subscribe(subscribeMethod: string, subscriptionMethod: string, parameters: any): Promise<string> {
    // Override this with subscription implementation
    return Promise.reject(new Error('Subscriptions are not supported'));
  }

  // Method to unsubscribe
  public unsubscribe(subscriptionId: string, unsubscribeMethod: string): Promise<boolean> {
    // Override this with unsubscribe implementation
    return Promise.reject(new Error('Subscriptions are not supported'));
  }

  protected abstract sendPayload(payload: JSONRPCRequest): Promise<JSONRPCResponse>;
}
