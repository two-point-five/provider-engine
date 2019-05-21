import Stoplight from '../util/stoplight';
import Subprovider from './subprovider';
export default class FilterSubprovider extends Subprovider {
    protected filterIndex: number;
    protected filters: any;
    protected filterDestroyHandlers: any;
    protected asyncBlockHandlers: any;
    protected asyncPendingBlockHandlers: any;
    protected _ready: Stoplight;
    protected pendingBlockTimeout: number;
    protected checkForPendingBlocksActive: boolean;
    constructor(opts?: any);
    handleRequest(payload: any, next: any, end: any): void;
    newBlockFilter(cb: any): void;
    newLogFilter(opts: any, done: any): void;
    newPendingTransactionFilter(done: any): void;
    getFilterChanges(hexFilterId: any, cb: any): any;
    getFilterLogs(hexFilterId: any, cb: any): any;
    uninstallFilter(hexFilterId: any, cb: any): void;
    checkForPendingBlocks(): void;
    onNewPendingBlock(block: any, cb: any): void;
    _getBlockNumber(cb: any): void;
    _logsForBlock(block: any, cb: any): void;
    _txHashesForBlock(block: any, cb: any): any;
}
