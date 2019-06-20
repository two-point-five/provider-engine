import eachSeries from 'async/eachSeries';
import PollingBlockTracker from 'eth-block-tracker';
import BaseProvider, { JSONRPCRequest, JSONRPCResponse, JSONRPCResponseHandler } from './base-provider';
import { default as Subprovider, SubproviderNextCallback } from './subprovider';
import { createPayload } from './util/create-payload';
import { toBuffer } from './util/eth-util';
import Stoplight from './util/stoplight';

export interface ProviderEngineOptions {
  blockTracker?: any;
  blockTrackerProvider?: any;
  pollingInterval?: number;
}

export default class Web3ProviderEngine extends BaseProvider {

  public currentBlock: any;

  // The latest block number we have received
  public currentBlockNumber?: string;

  protected _blockTracker: PollingBlockTracker;
  protected _ready: Stoplight;
  protected _providers: Subprovider[];
  protected _running: boolean = false;

  // Number of milliseconds to wait before retrying
  private blockTimeout = 300;

  // Maximum attempts to load a block
  private maxBlockRetries = 3;

  constructor(opts?: ProviderEngineOptions) {
    super();
    this.setMaxListeners(30);
    // parse options
    opts = opts || {};
    // block polling
    const directProvider = {
      sendAsync: (req, cb) => {
        this.sendPayload(req).then((res) => {
          cb(null, res);
        }).catch((err) => {
          cb(err);
        });
      },
    };
    const blockTrackerProvider = opts.blockTrackerProvider || directProvider;
    this._blockTracker = opts.blockTracker || new PollingBlockTracker({
      provider: blockTrackerProvider,
      pollingInterval: opts.pollingInterval || 4000,
      setSkipCacheFlag: true,
    });

    // set initialization blocker
    this._ready = new Stoplight();

    // local state
    this.currentBlock = null;
    this._providers = [];
  }

  public isRunning(): boolean {
    return this._running;
  }

  public start() {
    // trigger start
    this._ready.go();

    // on new block, request block body and emit as events
    this._blockTracker.on('latest', (blockNumber) => {
      this.currentBlockNumber = blockNumber;
      this.loadBlock(blockNumber);
    });

    // forward other events
    this._blockTracker.on('sync', this.emit.bind(this, 'sync'));
    this._blockTracker.on('error', this.emit.bind(this, 'error'));

    // update state
    this._running = true;
    // signal that we started
    this.emit('start');
  }

  public stop() {
    // stop block polling by removing event listeners
    this._blockTracker.removeAllListeners();
    // update state
    this._running = false;
    // signal that we stopped
    this.emit('stop');
  }

  public addProvider(source: Subprovider) {
    this._providers.push(source);
    source.setEngine(this);
  }

  public send(method: string, params: any[]): Promise<any> {
    // Wrap base class with Stoplight
    return new Promise((fulfill, reject) => {
      this._ready.await(() => {
        super.send(method, params).then(fulfill, reject);
      });
    });
  }

  public sendAsync(payload: JSONRPCRequest, cb: JSONRPCResponseHandler) {
    // Wrap base class with Stoplight
    this._ready.await(() => {
      super.sendAsync(payload, cb);
    });
  }

  // Actually perform the request
  protected sendPayload(payload: JSONRPCRequest): Promise<JSONRPCResponse> {
    return new Promise((fulfill, reject) => {
      let currentProvider = -1;
      let result = null;
      let error = null;

      // Stack of subprovider next callbacks
      const stack: SubproviderNextCallback[] = [];

      const next = (callback?: SubproviderNextCallback) => {
        currentProvider += 1;

        if (callback) {
          // Insert in front since eachSeries traverses from front
          stack.unshift(callback);
        }

        // Bubbled down as far as we could go, and the request wasn't
        // handled. Return an error.
        if (currentProvider >= this._providers.length) {
          // tslint:disable-next-line: max-line-length
          const msg = `Request for method "${payload.method}" not handled by any subprovider. Please check your subprovider configuration to ensure this method is handled.`;
          end(new Error(msg));
          return;
        }

        // Handle request in next subprovider
        try {
          const provider = this._providers[currentProvider];
          provider.handleRequest(payload, next, end);
        } catch (e) {
          end(e);
        }
      };

      const notifySubprovider = (fn: SubproviderNextCallback, callback: () => void) => {
        if (fn) {
          fn(error, result, callback);
        } else {
          callback();
        }
      };

      const end = (e: Error | null, r?: any) => {
        error = e;
        result = r;
        // Call any callbacks from subproviders
        eachSeries(stack, notifySubprovider).then(() => {
          // Reconstruct JSONRPCResponse
          const resultObj: JSONRPCResponse = {
            id: payload.id,
            jsonrpc: payload.jsonrpc,
            result,
          };
          // Complete promise
          if (error) {
            reject(error);
          } else {
            fulfill(resultObj);
          }
        });
      };

      // Call next() to kick things off
      next();
    });
  }

  // Tries to get the block payload recursively
  protected loadBlock(blockNumber: string, callCount: number = 0) {
    this._getBlockByNumber(blockNumber).then((blockResponse) => {
      // Result can be null if the block hasn't fully propagated to the nodes
      if (blockResponse.result) {
        this.updateBlock(blockResponse.result);
      } else if (callCount < this.maxBlockRetries && blockNumber === this.currentBlockNumber) {
        // Only call recursively if the current block number is still the same
        // and if we are under the retry limit.
        setTimeout(() => {
          this.loadBlock(blockNumber, callCount + 1);
        }, this.blockTimeout);
      } else {
        throw new Error(`Could not load block ${blockNumber} after 3 tries`);
      }
    }).catch((err) => {
      this.emit('error', err);
    });
  }

  // Parse the block into a buffer representation and update subscribers.
  protected updateBlock(block: any) {
    const bufferBlock = toBufferBlock(block);
    // set current + emit "block" event
    this._setCurrentBlock(bufferBlock);
    // emit other events
    this.emit('rawBlock', block);
    this.emit('latest', block);
  }

  protected _getBlockByNumber(blockNumber): Promise<JSONRPCResponse> {
    const req = createPayload({ method: 'eth_getBlockByNumber', params: [blockNumber, false], skipCache: true });
    return this.sendPayload(req);
  }

  protected _setCurrentBlock(block) {
    this.currentBlock = block;
    this.emit('block', block);
  }

}

// util

function toBufferBlock(jsonBlock) {
  return {
    number:           toBuffer(jsonBlock.number),
    hash:             toBuffer(jsonBlock.hash),
    parentHash:       toBuffer(jsonBlock.parentHash),
    nonce:            toBuffer(jsonBlock.nonce),
    mixHash:          toBuffer(jsonBlock.mixHash),
    sha3Uncles:       toBuffer(jsonBlock.sha3Uncles),
    logsBloom:        toBuffer(jsonBlock.logsBloom),
    transactionsRoot: toBuffer(jsonBlock.transactionsRoot),
    stateRoot:        toBuffer(jsonBlock.stateRoot),
    receiptsRoot:     toBuffer(jsonBlock.receiptRoot || jsonBlock.receiptsRoot),
    miner:            toBuffer(jsonBlock.miner),
    difficulty:       toBuffer(jsonBlock.difficulty),
    totalDifficulty:  toBuffer(jsonBlock.totalDifficulty),
    size:             toBuffer(jsonBlock.size),
    extraData:        toBuffer(jsonBlock.extraData),
    gasLimit:         toBuffer(jsonBlock.gasLimit),
    gasUsed:          toBuffer(jsonBlock.gasUsed),
    timestamp:        toBuffer(jsonBlock.timestamp),
    transactions:     jsonBlock.transactions,
  };
}
