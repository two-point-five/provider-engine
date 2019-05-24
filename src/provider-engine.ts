import eachSeries from 'async/eachSeries';
import map from 'async/map';
import PollingBlockTracker from 'eth-block-tracker';
import { EventEmitter } from 'events';
import Subprovider from './subproviders/subprovider';
import { createPayload } from './util/create-payload';
import { toBuffer } from './util/eth-util';
import Stoplight from './util/stoplight';

export interface JSONRPCResponse {
  id: number;
  jsonrpc: string;
  error?: any;
  result?: any;
}

export interface JSONRPCRequest {
  id?: number;
  jsonrpc?: string;
  method: string;
  params: any[];
  skipCache?: boolean; // proprietary field, tells provider not to respond from cache
  origin?: any; // proprietary field, tells provider what origin value to add to http request
}

export interface ProviderEngineOptions {
  blockTracker?: any;
  blockTrackerProvider?: any;
  pollingInterval?: number;
}

export type JSONRPCResponseHandler = (error: null | Error, response: JSONRPCResponse) => void;

export default class Web3ProviderEngine extends EventEmitter {

  public currentBlock: any;

  protected _blockTracker: PollingBlockTracker;
  protected _ready: Stoplight;
  protected _providers: Subprovider[];
  protected _running: boolean = false;

  constructor(opts?: ProviderEngineOptions) {
    super();
    this.setMaxListeners(30);
    // parse options
    opts = opts || {};
    // block polling
    const directProvider = {
      sendAsync: this._handleAsync.bind(this),
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
      // get block body
      this._getBlockByNumber(blockNumber, (err, block) => {
        if (err) {
          this.emit('error', err);
          return;
        }
        const bufferBlock = toBufferBlock(block);
        // set current + emit "block" event
        this._setCurrentBlock(bufferBlock);
        // emit other events
        this.emit('rawBlock', block);
        this.emit('latest', block);
      });
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

  // New send method
  public send(method: string, params: any[]): Promise<any> {
    const payload = {
      id: 0,
      jsonrpc: '2.0',
      method,
      params,
    };
    return new Promise((fulfill, reject) => {
      this._ready.await(() => {
        this._handleAsync(payload, (error, result) => {
          if (error) {
            reject(error);
          } else {
            fulfill(result);
          }
        });
      });
    });
  }

  // Legacy sendAsync method
  public sendAsync(payload: JSONRPCRequest, cb: JSONRPCResponseHandler) {
    if (Array.isArray(payload)) {
      // handle batch
      map(payload, this._handleAsync.bind(this), cb);
    } else {
      // handle single
      this._handleAsync(payload, cb);
    }
  }

  protected _handleAsync(payload: JSONRPCRequest, finished: JSONRPCResponseHandler) {
    let currentProvider = -1;
    let result = null;
    let error = null;

    const stack = [];

    const next = (after?) => {
      currentProvider += 1;
      stack.unshift(after);
      // Bubbled down as far as we could go, and the request wasn't
      // handled. Return an error.
      if (currentProvider >= this._providers.length) {
        // tslint:disable-next-line: max-line-length
        const msg = `Request for method "${payload.method}" not handled by any subprovider. Please check your subprovider configuration to ensure this method is handled.`;
        end(new Error(msg));
      } else {
        try {
          const provider = this._providers[currentProvider];
          provider.handleRequest(payload, next, end);
        } catch (e) {
          end(e);
        }
      }
    };

    const end = (_error: Error | undefined, _result: any | undefined = undefined) => {
      error = _error;
      result = _result;

      eachSeries(stack, (fn, callback) => {
        if (fn) {
          fn(error, result, callback);
        } else {
          callback();
        }
      }, () => {
        // console.log('COMPLETED:', payload)
        // console.log('RESULT: ', result)

        const resultObj: any = {
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
        } else {
          finished(null, resultObj);
        }
      });
    };

    next();
  }

  protected _getBlockByNumber(blockNumber, cb) {
    const req = createPayload({ method: 'eth_getBlockByNumber', params: [blockNumber, false], skipCache: true });
    this._handleAsync(req, (err, res) => {
      if (err) { return cb(err); }
      return cb(null, res.result);
    });
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
