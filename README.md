# Bitski ProviderEngine

Bitski's ProviderEngine is a refactored version of Metamask's original provider engine library. This is the base of the Bitski Javascript SDKs (both browser and node).

### Installation

`npm install @bitski/provider-engine`

### Differences from original package

- Written in Typescript
- Standard ES6 modules, designed for the browser first
- Designed to be extended with a properly exported Subprovider interface
- Base class implements new EthereumProvider standard
- Compatible with latest versions of web3.js
- Heavier dependencies removed to keep base package light (primarily all dependencies that rely on elliptic)
- Many small bug fixes and improvements

### To Do

- Reimplement HookedWalletSubprovider as a separate package
- Reimplement VmSubprovider as a separate package
- Reimplement NonceTracker as a separate package
- Improve test coverage

---

### Composable

Built to be modular - works via a stack of 'sub-providers' which are like normal web3 providers but only handle a subset of rpc methods.

The subproviders can emit new rpc requests in order to handle their own;  e.g. `eth_call` may trigger `eth_getAccountBalance`, `eth_getCode`, and others.
The provider engine also handles caching of rpc request results.

```js
import {
  default as ProviderEngine,
  CacheSubprovider,
  FixtureSubprovider,
  FilterSubprovider,
  FetchSubprovider
} from '@bitski/provider-engine';

const engine = new ProviderEngine();
const web3 = new Web3(engine);

// static results
engine.addProvider(new FixtureSubprovider({
  web3_clientVersion: 'ProviderEngine/v0.0.0/javascript',
  net_listening: true,
  eth_hashrate: '0x00',
  eth_mining: false,
  eth_syncing: true,
}));

// cache layer
engine.addProvider(new CacheSubprovider());

// filters
engine.addProvider(new FilterSubprovider());

// data source
engine.addProvider(new FetchSubprovider({
  rpcUrl: 'https://testrpc.metamask.io/',
}));

// log new blocks
engine.on('block', (block) => {
  console.log('================================')
  console.log('BLOCK CHANGED:', '#'+block.number.toString('hex'), '0x'+block.hash.toString('hex'))
  console.log('================================')
});

// network connectivity error
engine.on('error', (err) => {
  // report connectivity errors
  console.error(err.stack);
});

// start polling for blocks
engine.start();
```
