import Subprovider from './subprovider';
export default class BlockCacheProvider extends Subprovider {
    private _ready;
    private strategies;
    constructor(opts?: any);
    setEngine(engine: any): void;
    handleRequest(payload: any, next: any, end: any): any;
    _handleRequest(payload: any, next: any, end: any): any;
}
