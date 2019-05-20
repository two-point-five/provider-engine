import { EventEmitter } from 'events';
import { toBuffer } from './util/eth-util.js';
import PollingBlockTracker from 'eth-block-tracker';
import map from 'async/map';
import eachSeries from 'async/eachSeries';
import { createPayload } from './util/create-payload';
import Stoplight from './util/stoplight.js';

export default class Web3ProviderEngine extends EventEmitter {

  constructor(opts) {
    super();
    const self = this;
    self.setMaxListeners(30);
    // parse options
    opts = opts || {};

    // block polling
    const directProvider = {
      sendAsync(payload, callback) {
        payload.skipCache = true;
        self._handleAsync(payload, callback);
      }
    };
    const blockTrackerProvider = opts.blockTrackerProvider || directProvider;
    self._blockTracker = opts.blockTracker || new PollingBlockTracker({
      provider: blockTrackerProvider,
      pollingInterval: opts.pollingInterval || 4000,
    });

    // set initialization blocker
    self._ready = new Stoplight();

    // local state
    self.currentBlock = null;
    self._providers = [];
  }

  start() {
    const self = this;
    // handle new block
    self._blockTracker.on('latest', (blockNumber) => {
      self._setCurrentBlockNumber(blockNumber);
    });

    // emit block events from the block tracker
    self._blockTracker.on('sync', self.emit.bind(self, 'sync'));
    self._blockTracker.on('latest', self.emit.bind(self, 'latest'));

    // unblock initialization after first block
    self._blockTracker.once('latest', () => {
      self._ready.go();
    });
  }

  stop() {
    const self = this;
    // stop block polling
    self._blockTracker.removeAllListeners();
  }

  addProvider(source) {
    const self = this;
    self._providers.push(source);
    source.setEngine(this);
  }

  send(payload) {
    throw new Error('Web3ProviderEngine does not support synchronous requests.');
  }

  sendAsync(payload, cb){
    const self = this;
    self._ready.await(function(){

      if (Array.isArray(payload)) {
        // handle batch
        map(payload, self._handleAsync.bind(self), cb);
      } else {
        // handle single
        self._handleAsync(payload, cb);
      }

    });
  }

  _handleAsync(payload, finished) {
    var self = this;
    var currentProvider = -1;
    var result = null;
    var error = null;

    var stack = [];

    next();

    function next(after) {
      currentProvider += 1;
      stack.unshift(after);

      // Bubbled down as far as we could go, and the request wasn't
      // handled. Return an error.
      if (currentProvider >= self._providers.length) {
        end(new Error('Request for method "' + payload.method + '" not handled by any subprovider. Please check your subprovider configuration to ensure this method is handled.'));
      } else {
        try {
          var provider = self._providers[currentProvider];
          provider.handleRequest(payload, next, end);
        } catch (e) {
          end(e);
        }
      }
    }

    function end(_error, _result) {
      error = _error;
      result = _result;

      eachSeries(stack, function(fn, callback) {

        if (fn) {
          fn(error, result, callback);
        } else {
          callback();
        }
      }, function() {
        // console.log('COMPLETED:', payload)
        // console.log('RESULT: ', result)

        var resultObj = {
          id: payload.id,
          jsonrpc: payload.jsonrpc,
          result: result
        };

        if (error != null) {
          resultObj.error = {
            message: error.stack || error.message || error,
            code: -32000
          };
          // respond with both error formats
          finished(error, resultObj);
        } else {
          finished(null, resultObj);
        }
      });
    }
  }

  // Once we detect a new block number, load the block data
  _setCurrentBlockNumber(blockNumber) {
    const self = this;
    self.currentBlockNumber = blockNumber;
    // Make sure we skip the cache for this request
    self.sendAsync(createPayload({ method: 'eth_getBlockByNumber', params: [blockNumber, false], skipCache: true }), (err, result) => {
      if (err) return;
      const bufferBlock = toBufferBlock(result.result);
      self._setCurrentBlock(bufferBlock);
    });
  }

  _setCurrentBlock(block){
    const self = this;
    self.currentBlock = block;
    self.emit('block', block);
  }

}

// util

function toBufferBlock (jsonBlock) {
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
