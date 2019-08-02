import eachSeries from 'async/eachSeries';
import BaseProvider, { JSONRPCRequest, JSONRPCResponse, JSONRPCResponseHandler } from './base-provider';
import { ProviderEngineError, ProviderEngineErrorCode } from './errors/provider-engine-error';
import { default as Subprovider, SubproviderNextCallback } from './subprovider';
import BlockTracker, { BufferBlock } from './util/block-tracker';
import Stoplight from './util/stoplight';

export interface ProviderEngineOptions {
  blockTracker?: any;
  blockTrackerProvider?: any;
  pollingInterval?: number;
  disableBlockTracking?: boolean;
  debug?: boolean;
}

export default class Web3ProviderEngine extends BaseProvider {

  public currentBlock?: BufferBlock;

  protected _blockTracker: BlockTracker;
  protected _ready: Stoplight;
  protected _providers: Subprovider[];
  protected _pollForBlocks: boolean = true;
  protected _running: boolean = false;

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

    if (opts.disableBlockTracking === true) {
      this._pollForBlocks = false;
    }

    const blockTrackerProvider = opts.blockTrackerProvider || directProvider;
    this._blockTracker = new BlockTracker({
      provider: blockTrackerProvider,
      blockTracker: opts.blockTracker,
      pollingInterval: opts.pollingInterval || 4000,
    });

    this._blockTracker.on('block', this._setCurrentBlock.bind(this));
    this._blockTracker.on('sync', this.emit.bind(this, 'sync'));
    this._blockTracker.on('rawBlock', this.emit.bind(this, 'rawBlock'));
    this._blockTracker.on('latest', this.emit.bind(this, 'latest'));

    // Handle errors instead of re-emitting, since they will throw otherwise
    this._blockTracker.on('error', (error) => {
      // Ignore errors from the block tracker unless debug is enabled
      if (opts.debug) {
        console.log('DEBUG: ' + error.message);
      }
    });

    // set initialization blocker
    this._ready = new Stoplight();
    this._providers = [];
  }

  public isRunning(): boolean {
    return this._running;
  }

  public start() {
    // trigger start
    this._ready.go();

    if (this._pollForBlocks) {
      // start tracking blocks
      this._blockTracker.start();
    }

    // update state
    this._running = true;
    // signal that we started
    this.emit('start');
  }

  public stop() {
    // stop block tracking
    this._blockTracker.stop();
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
          const msg = `Request for method "${payload.method}" not handled by any subprovider.`;
          end(new ProviderEngineError(msg, ProviderEngineErrorCode.UnhandledRequest));
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

  protected _setCurrentBlock(bufferBlock: BufferBlock) {
    this.currentBlock = bufferBlock;
    this.emit('block', bufferBlock);
  }

}
