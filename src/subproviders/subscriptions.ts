import { JSONRPCRequest } from '../provider-engine';
import { bufferToHex } from '../util/eth-util';
import { bufferToQuantityHex } from '../util/rpc-hex-encoding';
import FilterSubprovider, { FilterSubproviderOptions } from './filters';

export default class SubscriptionSubprovider extends FilterSubprovider {

  protected subscriptions: any;

  constructor(opts?: FilterSubproviderOptions) {
    super(opts);
    this.subscriptions = {};
  }

  public handleRequest(
    payload: JSONRPCRequest,
    next: (cb?) => void,
    end: (error: Error | null, result?: any) => void,
  ) {
    switch (payload.method) {
      case 'eth_subscribe':
        this.eth_subscribe(payload, end);
        break;
      case 'eth_unsubscribe':
        this.eth_unsubscribe(payload, end);
        break;
      default:
        super.handleRequest(payload, next, end);
    }
  }

  protected eth_subscribe(payload: JSONRPCRequest, cb: (error: Error | null, result?: any) => void) {
    const subscriptionType = payload.params[0];

    const callback = (err, hexId) => {
      if (err) { return cb(err); }

      const id = parseInt(hexId, 16);
      this.subscriptions[id] = subscriptionType;
      this.filters[id].on('data', (results) => {
        this.filters[id].clearChanges();
        if (!Array.isArray(results)) {
          results = [results];
        }
        results.forEach((r) => this._notificationHandler(hexId, subscriptionType, r));
      });

      if (subscriptionType === 'newPendingTransactions') {
        this.checkForPendingBlocks();
      }

      cb(null, hexId);
    };

    switch (subscriptionType) {
      case 'logs':
        const options = payload.params[1];
        this.newLogFilter(options, callback);
        break;
      case 'newPendingTransactions':
        this.newPendingTransactionFilter(callback);
        break;
      case 'newHeads':
        this.newBlockFilter(callback);
        break;
      case 'syncing':
      default:
        cb(new Error('unsupported subscription type'));
        return;
    }
  }

  protected eth_unsubscribe(payload: JSONRPCRequest, cb: (error: Error | null, result?: any) => void) {
    const hexId = payload.params[0];
    const id = parseInt(hexId, 16);
    if (!this.subscriptions[id]) {
      cb(new Error(`Subscription ID ${hexId} not found.`));
    } else {
      this.uninstallFilter(hexId, (err, result) => {
        delete this.subscriptions[id];
        cb(err, result);
      });
    }
  }

  private _notificationHandler(hexId, subscriptionType, result) {
    if (subscriptionType === 'newHeads') {
      result = this._notificationResultFromBlock(result);
    }

    // it seems that web3 doesn't expect there to be a separate error event
    // so we must emit null along with the result object
    this.emit('data', null, {
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: hexId,
        result,
      },
    });
  }

  private _notificationResultFromBlock(block) {
    return {
      hash: bufferToHex(block.hash),
      parentHash: bufferToHex(block.parentHash),
      sha3Uncles: bufferToHex(block.sha3Uncles),
      miner: bufferToHex(block.miner),
      stateRoot: bufferToHex(block.stateRoot),
      transactionsRoot: bufferToHex(block.transactionsRoot),
      receiptsRoot: bufferToHex(block.receiptsRoot),
      logsBloom: bufferToHex(block.logsBloom),
      difficulty: bufferToQuantityHex(block.difficulty),
      number: bufferToQuantityHex(block.number),
      gasLimit: bufferToQuantityHex(block.gasLimit),
      gasUsed: bufferToQuantityHex(block.gasUsed),
      nonce: block.nonce ? bufferToHex(block.nonce) : null,
      mixHash: bufferToHex(block.mixHash),
      timestamp: bufferToQuantityHex(block.timestamp),
      extraData: bufferToHex(block.extraData),
    };
  }
}
