import Subprovider from './subprovider.js';
interface Provider {
    sendAsync(payload: any, callback: (err: any, response: any) => {}): any;
}
export default class ProviderSubprovider extends Subprovider {
    protected provider: Provider;
    constructor(provider: Provider);
    handleRequest(payload: any, next: any, end: any): void;
}
export {};
