import Subprovider from './subprovider.js';
export default class NonceTrackerSubprovider extends Subprovider {
    constructor(opts: any);
    handleRequest(payload: any, next: any, end: any): void;
}
