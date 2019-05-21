import Subprovider from './subprovider';
export default class SanitizerSubprovider extends Subprovider {
    constructor();
    handleRequest(payload: any, next: any, end: any): void;
}
