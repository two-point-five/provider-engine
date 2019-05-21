import Subprovider from './subprovider';
export default class InflightCacheSubprovider extends Subprovider {
    protected inflightRequests: any;
    constructor();
    handleRequest(req: any, next: any, end: any): any;
}
