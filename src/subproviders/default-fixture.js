import extend from 'xtend';
import FixtureProvider from './fixture.js';
const version = require('../package.json').version;

export default class DefaultFixtures extends FixtureProvider {
  constructor(opts) {
    opts = opts || {};
    var responses = extend({
      web3_clientVersion: 'ProviderEngine/v'+version+'/javascript',
      net_listening: true,
      eth_hashrate: '0x00',
      eth_mining: false,
    }, opts);
    super(responses);
  }
}
