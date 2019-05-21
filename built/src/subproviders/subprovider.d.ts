/// <reference types="node" />
import { EventEmitter } from 'events';
import Web3ProviderEngine from '..';
export default abstract class Subprovider extends EventEmitter {
    protected engine: Web3ProviderEngine;
    protected currentBlock: any;
    constructor();
    setEngine(engine: any): void;
    abstract handleRequest(payload: any, next: any, end: any): void;
    emitPayload(payload: any, cb: any): void;
}
