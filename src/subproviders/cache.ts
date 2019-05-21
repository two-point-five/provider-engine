import BN = require('bn.js');
import { bufferToHex, toBuffer } from '../util/eth-util';
import { blockTagForPayload, cacheTypeForPayload } from '../util/rpc-cache-utils';
import Stoplight from '../util/stoplight';
import BlockCacheStrategy from './cache-strategies/block-strategy';
import ConditionalPermaCacheStrategy from './cache-strategies/conditional-perma-strategy';
import Subprovider from './subprovider';

export default class BlockCacheProvider extends Subprovider {

  private _ready: Stoplight;
  private strategies: any;

  constructor(opts?) {
    super();
    opts = opts || {};
    // set initialization blocker
    this._ready = new Stoplight();
    this.strategies = {
      perma: new ConditionalPermaCacheStrategy({
        eth_getTransactionByHash: containsBlockhash,
        eth_getTransactionReceipt: containsBlockhash,
      }),
      block: new BlockCacheStrategy(),
      fork: new BlockCacheStrategy(),
    };
  }

  // setup a block listener on 'setEngine'
  public setEngine(engine) {
    this.engine = engine;

    const clearOldCache = (newBlock) => {
      const previousBlock = this.currentBlock;
      this.currentBlock = newBlock;
      if (!previousBlock) { return; }
      this.strategies.block.cacheRollOff(previousBlock);
      this.strategies.fork.cacheRollOff(previousBlock);
    };

    // unblock initialization after first block
    engine.once('block', (block) => {
      this.currentBlock = block;
      this._ready.go();
      // from now on, empty old cache every block
      engine.on('block', clearOldCache);
    });
  }

  public handleRequest(payload, next, end) {
    // skip cache if told to do so
    if (payload.skipCache) {
      // console.log('CACHE SKIP - skip cache if told to do so')
      return next();
    }

    // Ignore requests for the latest block
    if (payload.method === 'eth_getBlockByNumber' && payload.params[0] === 'latest') {
      // console.log('CACHE SKIP - Ignore block polling requests.')
      return next();
    }

    // wait for first block
    this._ready.await(() => {
      // actually handle the request
      this._handleRequest(payload, next, end);
    });
  }

  public _handleRequest(payload, next, end) {
    const type = cacheTypeForPayload(payload);
    const strategy = this.strategies[type];

    // If there's no strategy in place, pass it down the chain.
    if (!strategy) {
      return next();
    }

    // If the strategy can't cache this request, ignore it.
    if (!strategy.canCache(payload)) {
      return next();
    }

    let blockTag = blockTagForPayload(payload);
    if (!blockTag) { blockTag = 'latest'; }

    let requestedBlockNumber;
    if (blockTag === 'earliest') {
      requestedBlockNumber = '0x00';
    } else if (blockTag === 'latest') {
      requestedBlockNumber = bufferToHex(this.currentBlock.number);
    } else {
      // We have a hex number
      requestedBlockNumber = blockTag;
    }

    // console.log('REQUEST at block 0x' + requestedBlockNumber.toString('hex'))

    // end on a hit, continue on a miss
    strategy.hitCheck(payload, requestedBlockNumber, end, () => {
      // miss fallthrough to provider chain, caching the result on the way back up.
      next((err, result, cb) => {
        // err is already handled by engine
        if (err) { return cb(); }
        strategy.cacheResult(payload, result, requestedBlockNumber, cb);
      });
    });
  }
}

function hexToBN(hex) {
  return new BN(toBuffer(hex));
}

function containsBlockhash(result) {
  if (!result) { return false; }
  if (!result.blockHash) { return false; }
  const hasNonZeroHash = hexToBN(result.blockHash).gt(new BN(0));
  return hasNonZeroHash;
}
