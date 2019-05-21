import Subprovider from './subprovider';
export default class FixtureProvider extends Subprovider {
    protected staticResponses: any;
    constructor(staticResponses: any);
    handleRequest(payload: any, next: any, end: any): void;
}
