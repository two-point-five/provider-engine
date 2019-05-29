import parallel from 'async/parallel';
import { JSONRPCRequest } from '../base-provider';
import Subprovider, { CompletionHandler, NextHandler } from '../subprovider';
import { intToHex, stripHexPrefix } from '../util/eth-util';
import Stoplight from '../util/stoplight';
import BlockFilter from './filters/block-filter';
import LogFilter from './filters/log-filter';
import PendingTransactionFilter from './filters/pending-tx-filter';

// handles the following RPC methods:
//   eth_newBlockFilter
//   eth_newPendingTransactionFilter
//   eth_newFilter
//   eth_getFilterChanges
//   eth_uninstallFilter
//   eth_getFilterLogs

export interface FilterSubproviderOptions {
  maxFilters?: number;
  pendingBlockTimeout?: number;
}

export default class FilterSubprovider extends Subprovider {

  protected filterIndex: number;
  protected filters: any;
  protected filterDestroyHandlers: any;
  protected asyncBlockHandlers: any;
  protected asyncPendingBlockHandlers: any;
  protected _ready: Stoplight;
  protected pendingBlockTimeout: number;
  protected checkForPendingBlocksActive: boolean;

  constructor(opts?: FilterSubproviderOptions) {
    super();
    opts = opts || {};
    this.filterIndex = 0;
    this.filters = {};
    this.filterDestroyHandlers = {};
    this.asyncBlockHandlers = {};
    this.asyncPendingBlockHandlers = {};
    this._ready = new Stoplight();
    this._ready.setMaxListeners(opts.maxFilters || 25);
    this._ready.go();
    this.pendingBlockTimeout = opts.pendingBlockTimeout || 4000;
    this.checkForPendingBlocksActive = false;

    // TODO: Actually load the blocks

    // we dont have engine immeditately
    setTimeout(() => {
      // asyncBlockHandlers require locking provider until updates are completed
      this.engine.on('block', (block) => {
        // pause processing
        this._ready.stop();
        // update filters
        const updaters = valuesFor(this.asyncBlockHandlers).map((fn) => fn.bind(null, block));
        parallel(updaters, (err) => {
          // tslint:disable-next-line: no-console
          if (err) { console.error(err); }
          // unpause processing
          this._ready.go();
        });
      });
    });
  }

  public handleRequest(payload: JSONRPCRequest, next: NextHandler, end: CompletionHandler): void {
    switch (payload.method) {

      case 'eth_newBlockFilter':
        this.newBlockFilter(end);
        return;

      case 'eth_newPendingTransactionFilter':
        this.newPendingTransactionFilter(end);
        this.checkForPendingBlocks();
        return;

      case 'eth_newFilter':
        this.newLogFilter(payload.params[0], end);
        return;

      case 'eth_getFilterChanges':
        this._ready.await(() => {
          this.getFilterChanges(payload.params[0], end);
        });
        return;

      case 'eth_getFilterLogs':
        this._ready.await(() => {
          this.getFilterLogs(payload.params[0], end);
        });
        return;

      case 'eth_uninstallFilter':
        this._ready.await(() => {
          this.uninstallFilter(payload.params[0], end);
        });
        return;

      default:
        next();
        return;
    }
  }

  public newBlockFilter(cb) {
    this._getBlockNumber((err, blockNumber) => {
      if (err) { return cb(err); }

      const filter = new BlockFilter({
        blockNumber,
      });

      const newBlockHandler = filter.update.bind(filter);
      this.engine.on('block', newBlockHandler);
      const destroyHandler = () => {
        this.engine.removeListener('block', newBlockHandler);
      };

      this.filterIndex++;
      this.filters[this.filterIndex] = filter;
      this.filterDestroyHandlers[this.filterIndex] = destroyHandler;

      const hexFilterIndex = intToHex(this.filterIndex);
      cb(null, hexFilterIndex);
    });
  }

  public newLogFilter(opts, done) {
    const filter = new LogFilter(opts);
    const newLogHandler = filter.update.bind(filter);
    const blockHandler = (block, cb) => {
      this._logsForBlock(block, (err, logs) => {
        if (err) { return cb(err); }
        newLogHandler(logs);
        cb();
      });
    };

    this.filterIndex++;
    this.asyncBlockHandlers[this.filterIndex] = blockHandler;
    this.filters[this.filterIndex] = filter;

    const hexFilterIndex = intToHex(this.filterIndex);
    done(null, hexFilterIndex);
  }

  public newPendingTransactionFilter(done) {
    const filter = new PendingTransactionFilter();
    const newTxHandler = filter.update.bind(filter);
    const blockHandler = (block, cb) => {
      this._txHashesForBlock(block, (err, txs) => {
        if (err) { return cb(err); }
        newTxHandler(txs);
        cb();
      });
    };

    this.filterIndex++;
    this.asyncPendingBlockHandlers[this.filterIndex] = blockHandler;
    this.filters[this.filterIndex] = filter;

    const hexFilterIndex = intToHex(this.filterIndex);
    done(null, hexFilterIndex);
  }

  public getFilterChanges(hexFilterId, cb) {
    const filterId = parseInt(hexFilterId, 16);
    const filter = this.filters[filterId];
    // if (!filter) { console.warn('FilterSubprovider - no filter with that id:', hexFilterId); }
    if (!filter) { return cb(null, []); }
    const results = filter.getChanges();
    filter.clearChanges();
    cb(null, results);
  }

  public getFilterLogs(hexFilterId, cb) {
    const filterId = parseInt(hexFilterId, 16);
    const filter = this.filters[filterId];
    // if (!filter) { console.warn('FilterSubprovider - no filter with that id:', hexFilterId); }
    if (!filter) { return cb(null, []); }
    if (filter.type === 'log') {
      this.emitPayload({
        id: 0,
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [{
          fromBlock: filter.fromBlock,
          toBlock: filter.toBlock,
          address: filter.address,
          topics: filter.topics,
        }],
      }, (err, res) => {
        if (err) { return cb(err); }
        cb(null, res.result);
      });
    } else {
      cb(null, []);
    }
  }

  public uninstallFilter(hexFilterId, cb) {
    const filterId = parseInt(hexFilterId, 16);
    const filter = this.filters[filterId];
    if (!filter) {
      cb(null, false);
      return;
    }

    this.filters[filterId].removeAllListeners();

    const destroyHandler = this.filterDestroyHandlers[filterId];

    delete this.filters[filterId];
    delete this.asyncBlockHandlers[filterId];
    delete this.asyncPendingBlockHandlers[filterId];
    delete this.filterDestroyHandlers[filterId];
    if (destroyHandler) { destroyHandler(); }

    cb(null, true);
  }

  public checkForPendingBlocks() {
    if (this.checkForPendingBlocksActive) { return; }
    const activePendingTxFilters = !!Object.keys(this.asyncPendingBlockHandlers).length;
    if (activePendingTxFilters) {
      this.checkForPendingBlocksActive = true;
      this.emitPayload({
        id: 0,
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: ['pending', true],
      }, (err, res) => {
        if (err) {
          this.checkForPendingBlocksActive = false;
          // console.error(err);
          return;
        }
        this.onNewPendingBlock(res.result, () => {
          // if (err) { console.error(err); }
          this.checkForPendingBlocksActive = false;
          setTimeout(this.checkForPendingBlocks.bind(this), this.pendingBlockTimeout);
        });
      });
    }
  }

  public onNewPendingBlock(block, cb) {
    // update filters
    const updaters = valuesFor(this.asyncPendingBlockHandlers).map((fn) => fn.bind(null, block));
    parallel(updaters, cb);
  }

  public _getBlockNumber(cb) {
    const blockNumber = bufferToNumberHex(this.engine.currentBlock.number);
    cb(null, blockNumber);
  }

  public _logsForBlock(block, cb) {
    const blockNumber = bufferToNumberHex(block.number);
    this.emitPayload({
      id: 0,
      jsonrpc: '2.0',
      method: 'eth_getLogs',
      params: [{
        fromBlock: blockNumber,
        toBlock: blockNumber,
      }],
    }, (err, response) => {
      if (err) { return cb(err); }
      if (response.error) { return cb(response.error); }
      cb(null, response.result);
    });
  }

  public _txHashesForBlock(block, cb) {
    const txs = block.transactions;
    // short circuit if empty
    if (txs.length === 0) { return cb(null, []); }
    // txs are already hashes
    if ('string' === typeof txs[0]) {
      cb(null, txs);
    // txs are obj, need to map to hashes
    } else {
      const results = txs.map((tx) => tx.hash);
      cb(null, results);
    }
  }

}

// util

function bufferToNumberHex(buffer) {
  return stripLeadingZero(buffer.toString('hex'));
}

function stripLeadingZero(hexNum) {
  let stripped = stripHexPrefix(hexNum);
  while (stripped[0] === '0') {
    stripped = stripped.substr(1);
  }
  return `0x${stripped}`;
}

function valuesFor(obj) {
  return Object.keys(obj).map((key) => obj[key]);
}
