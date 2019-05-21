import extend from 'xtend';
import pkg = require('../../package.json');
import FixtureProvider from './fixture.js';

export default class DefaultFixtures extends FixtureProvider {
  constructor(opts) {
    opts = opts || {};
    const responses = extend({
      web3_clientVersion: 'ProviderEngine/v' + pkg.version + '/javascript',
      net_listening: true,
      eth_hashrate: '0x00',
      eth_mining: false,
    }, opts);
    super(responses);
  }
}
