import FilterSubprovider from './filters';
export default class SubscriptionSubprovider extends FilterSubprovider {
    protected subscriptions: any;
    constructor(opts?: any);
    handleRequest(payload: any, next: any, end: any): void;
    protected eth_subscribe(payload: any, cb: any): void;
    protected eth_unsubscribe(payload: any, cb: any): void;
    private _notificationHandler;
    private _notificationResultFromBlock;
}
