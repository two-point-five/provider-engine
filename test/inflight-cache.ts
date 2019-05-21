import asyncParallel from 'async/parallel';
import test = require('tape');
import ProviderEngine from '../src/index';
import FixtureProvider from '../src/subproviders/fixture';
import InflightCacheProvider from '../src/subproviders/inflight-cache';
import { createPayload } from '../src/util/create-payload';
import TestBlockProvider from './util/block';
import injectMetrics from './util/inject-metrics';

inflightTest('getBalance for latest', {
  method: 'eth_getBalance',
  params: ['0xabcd', 'latest'],
}, true);

inflightTest('getBlock for latest', {
  method: 'eth_getBlockByNumber',
  params: ['latest', false],
}, true);

inflightTest('getBlock for latest then 0', [{
  method: 'eth_getBlockByNumber',
  params: ['latest', false],
}, {
  method: 'eth_getBlockByNumber',
  params: ['0x0', false],
}], false);

function inflightTest(label, payloads, shouldHitCacheOnSecondRequest) {
  if (!Array.isArray(payloads)) {
    payloads = [payloads, payloads];
  }

  test('inflight cache - ' + label, (t) => {
    t.plan(6);

    // cache layer
    const cacheProvider = injectMetrics(new InflightCacheProvider());
    // handle balance
    const dataProvider = injectMetrics(new FixtureProvider({
      eth_getBalance: '0xdeadbeef',
    }));
    // handle dummy block
    const blockProvider = injectMetrics(new TestBlockProvider());

    const engine = new ProviderEngine();
    engine.addProvider(cacheProvider);
    engine.addProvider(dataProvider);
    engine.addProvider(blockProvider);

    // run polling until first block
    engine.start();
    engine.once('block', () => {
      // stop polling
      engine.stop();
      // clear subprovider metrics
      cacheProvider.clearMetrics();
      dataProvider.clearMetrics();
      blockProvider.clearMetrics();

      // determine which provider will handle the request
      const isBlockTest = (payloads[0].method === 'eth_getBlockByNumber');
      const handlingProvider = isBlockTest ? blockProvider : dataProvider;

      // begin cache test
      cacheCheck(t, engine, cacheProvider, handlingProvider, payloads, () => {
        t.end();
      });
    });

    function cacheCheck(_t, _engine, _cacheProvider, _handlingProvider, requests, cb) {
      const method = requests[0].method;
      requestSimultaneous(requests, noop, noop, (err, responses) => {
        // first request
        _t.ifError(err, 'did not error');
        _t.ok(responses && responses.filter(Boolean).length, 'has responses');

        if (shouldHitCacheOnSecondRequest) {

          _t.equal(_cacheProvider.getWitnessed(method).length, 2, 'cacheProvider did see "' + method + '"');
          _t.equal(_cacheProvider.getHandled(method).length, 1, 'cacheProvider did NOT handle "' + method + '"');

          _t.equal(_handlingProvider.getWitnessed(method).length, 1, 'handlingProvider did see "' + method + '"');
          _t.equal(_handlingProvider.getHandled(method).length, 1, 'handlingProvider did handle "' + method + '"');

        } else {

          _t.equal(_cacheProvider.getWitnessed(method).length, 2, 'cacheProvider did see "' + method + '"');
          _t.equal(_cacheProvider.getHandled(method).length, 0, 'cacheProvider did NOT handle "' + method + '"');

          _t.equal(_handlingProvider.getWitnessed(method).length, 2, 'handlingProvider did see "' + method + '"');
          _t.equal(_handlingProvider.getHandled(method).length, 2, 'handlingProvider did handle "' + method + '"');

        }
        cb();
      });
    }

    function requestSimultaneous(requests, afterFirst, afterSecond, cb) {
      asyncParallel([
        (_cb) => {
          engine.sendAsync(createPayload(requests[0]), (err, result) => {
            afterFirst(err, result);
            _cb(err, result);
          });
        },
        (_cb) => {
          engine.sendAsync(createPayload(requests[1]), (err, result) => {
            afterSecond(err, result);
            _cb(err, result);
          });
        },
      ], cb);
    }
  });

}

// tslint:disable-next-line: no-empty
function noop() {}
