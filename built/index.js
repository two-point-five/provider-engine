import map from 'async/map';
import { EventEmitter } from 'events';
import { createPayload } from './util/create-payload';
import { toBuffer } from './util/eth-util';
import Stoplight from './util/stoplight';
export default class Web3ProviderEngine extends EventEmitter {
    constructor(opts) {
        super();
        this.setMaxListeners(30);
        // parse options
        opts = opts || {};
        // block polling
        const directProvider = {
            sendAsync: (payload, callback) => {
                payload.skipCache = true;
                this._handleAsync(payload, callback);
            },
        };
        const blockTrackerProvider = opts.blockTrackerProvider || directProvider;
        this._blockTracker = opts.blockTracker || new PollingBlockTracker({
            provider: blockTrackerProvider,
            pollingInterval: opts.pollingInterval || 4000,
        });
        // set initialization blocker
        this._ready = new Stoplight();
        // local state
        this.currentBlock = null;
        this._providers = [];
    }
    start() {
        // handle new block
        this._blockTracker.on('latest', (blockNumber) => {
            this._setCurrentBlockNumber(blockNumber);
        });
        // emit block events from the block tracker
        this._blockTracker.on('sync', this.emit.bind(this, 'sync'));
        this._blockTracker.on('latest', this.emit.bind(this, 'latest'));
        // unblock initialization after first block
        this._blockTracker.once('latest', () => {
            this._ready.go();
        });
    }
    stop() {
        // stop block polling
        this._blockTracker.removeAllListeners();
    }
    addProvider(source) {
        this._providers.push(source);
        source.setEngine(this);
    }
    send(payload) {
        throw new Error('Web3ProviderEngine does not support synchronous requests.');
    }
    sendAsync(payload, cb) {
        this._ready.await(() => {
            if (Array.isArray(payload)) {
                // handle batch
                map(payload, this._handleAsync.bind(this), cb);
            }
            else {
                // handle single
                this._handleAsync(payload, cb);
            }
        });
    }
    _handleAsync(payload, finished) {
        let currentProvider = -1;
        let result = null;
        let error = null;
        const stack = [];
        const next = (after) => {
            currentProvider += 1;
            stack.unshift(after);
            // Bubbled down as far as we could go, and the request wasn't
            // handled. Return an error.
            if (currentProvider >= this._providers.length) {
                // tslint:disable-next-line: max-line-length
                const msg = `Request for method "${payload.method}" not handled by any subprovider. Please check your subprovider configuration to ensure this method is handled.`;
                end(new Error(msg));
            }
            else {
                try {
                    const provider = this._providers[currentProvider];
                    provider.handleRequest(payload, next, end);
                }
                catch (e) {
                    end(e);
                }
            }
        };
        const end = (_error, _result = undefined) => {
            error = _error;
            result = _result;
            eachSeries(stack, (fn, callback) => {
                if (fn) {
                    fn(error, result, callback);
                }
                else {
                    callback();
                }
            }, () => {
                // console.log('COMPLETED:', payload)
                // console.log('RESULT: ', result)
                const resultObj = {
                    id: payload.id,
                    jsonrpc: payload.jsonrpc,
                    result,
                };
                if (error != null) {
                    resultObj.error = {
                        message: error.stack || error.message || error,
                        code: -32000,
                    };
                    // respond with both error formats
                    finished(error, resultObj);
                }
                else {
                    finished(null, resultObj);
                }
            });
        };
        next();
    }
    // Once we detect a new block number, load the block data
    _setCurrentBlockNumber(blockNumber) {
        const self = this;
        self.currentBlockNumber = blockNumber;
        // Make sure we skip the cache for this request
        const payload = createPayload({ method: 'eth_getBlockByNumber', params: [blockNumber, false], skipCache: true });
        self.sendAsync(payload, (err, result) => {
            if (err) {
                return;
            }
            const bufferBlock = toBufferBlock(result.result);
            self._setCurrentBlock(bufferBlock);
        });
    }
    _setCurrentBlock(block) {
        const self = this;
        self.currentBlock = block;
        self.emit('block', block);
    }
}
// util
function toBufferBlock(jsonBlock) {
    return {
        number: toBuffer(jsonBlock.number),
        hash: toBuffer(jsonBlock.hash),
        parentHash: toBuffer(jsonBlock.parentHash),
        nonce: toBuffer(jsonBlock.nonce),
        mixHash: toBuffer(jsonBlock.mixHash),
        sha3Uncles: toBuffer(jsonBlock.sha3Uncles),
        logsBloom: toBuffer(jsonBlock.logsBloom),
        transactionsRoot: toBuffer(jsonBlock.transactionsRoot),
        stateRoot: toBuffer(jsonBlock.stateRoot),
        receiptsRoot: toBuffer(jsonBlock.receiptRoot || jsonBlock.receiptsRoot),
        miner: toBuffer(jsonBlock.miner),
        difficulty: toBuffer(jsonBlock.difficulty),
        totalDifficulty: toBuffer(jsonBlock.totalDifficulty),
        size: toBuffer(jsonBlock.size),
        extraData: toBuffer(jsonBlock.extraData),
        gasLimit: toBuffer(jsonBlock.gasLimit),
        gasUsed: toBuffer(jsonBlock.gasUsed),
        timestamp: toBuffer(jsonBlock.timestamp),
        transactions: jsonBlock.transactions,
    };
}
