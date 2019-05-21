/// <reference types="node" />
import PollingBlockTracker from 'eth-block-tracker';
import { EventEmitter } from 'events';
import Stoplight from './util/stoplight';
export default class Web3ProviderEngine extends EventEmitter {
    _blockTracker: PollingBlockTracker;
    _ready: Stoplight;
    currentBlock: any;
    currentBlockNumber: any;
    _providers: any[];
    constructor(opts: any);
    start(): void;
    stop(): void;
    addProvider(source: any): void;
    send(payload: any): void;
    sendAsync(payload: any, cb: any): void;
    _handleAsync(payload: any, finished: any): void;
    _setCurrentBlockNumber(blockNumber: any): void;
    _setCurrentBlock(block: any): void;
}
