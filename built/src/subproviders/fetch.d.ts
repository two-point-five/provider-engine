import Subprovider from './subprovider';
export default class RpcSource extends Subprovider {
    protected rpcUrl: string;
    protected originHttpHeaderKey: string;
    constructor(opts: any);
    handleRequest(payload: any, next: any, end: any): void;
    _submitRequest(reqParams: any, done: any): void;
}
