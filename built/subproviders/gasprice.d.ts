import Subprovider from './subprovider';
export default class GaspriceProvider extends Subprovider {
    numberOfBlocks: number;
    delayInBlocks: number;
    constructor(opts: any);
    handleRequest(payload: any, next: any, end: any): any;
}
