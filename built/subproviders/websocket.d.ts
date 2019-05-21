import Subprovider from './subprovider.js';
export default class WebsocketSubprovider extends Subprovider {
    constructor({ rpcUrl, debug, origin }: {
        rpcUrl: any;
        debug: any;
        origin: any;
    });
    handleRequest(payload: any, next: any, end: any): void;
    _handleSocketClose({ reason, code }: {
        reason: any;
        code: any;
    }): void;
    _handleSocketMessage(message: any): any;
    _handleSocketOpen(): void;
    _openSocket(): void;
}
