// tslint:disable: max-line-length

import test = require('tape');
import { waterfall as asyncWaterfall } from 'async';
import ProviderEngine from '../src/index';
import FilterProvider from '../src/subproviders/filters';
import { createPayload } from '../src/util/create-payload';
import TestBlockProvider from './util/block';
import injectMetrics from './util/inject-metrics';

filterTest('block filter - basic', { method: 'eth_newBlockFilter' },
  function afterInstall(t, testMeta, response, cb) {
    testMeta.block = testMeta.blockProvider.nextBlock();
    cb();
  },
  function filterChangesOne(t, testMeta, response, cb) {
    const results = response.result;
    const returnedBlockHash = response.result[0];
    t.equal(results.length, 1, 'correct number of results');
    t.equal(returnedBlockHash, testMeta.block.hash, 'correct result');
    cb();
  },
  function filterChangesTwo(t, testMeta, response, cb) {
    const results = response.result;
    t.equal(results.length, 0, 'correct number of results');
    cb();
  },
);

filterTest('log filter - basic', {
  method: 'eth_newFilter',
  params: [{
    topics: ['0x00000000000000000000000000000000000000000000000000deadbeefcafe01']
  }]
},
function afterInstall(t, testMeta, response, cb) {
  testMeta.tx = testMeta.blockProvider.addTx({
    hash: '0x0000000000000000000000000000000000000000000000000000000000000001',
    _logTopics: ['0x00000000000000000000000000000000000000000000000000deadbeefcafe01']
  });
  testMeta.badTx = testMeta.blockProvider.addTx({
    _logTopics: ['0x00000000000000000000000000000000000000000000000000deadbeefcafe02']
  });
  testMeta.block = testMeta.blockProvider.nextBlock();
  cb();
},
function filterChangesOne(t, testMeta, response, cb) {
  const results = response.result;
  const matchedLog = response.result[0];
  t.equal(results.length, 1, 'correct number of results');
  t.equal(matchedLog.transactionHash, testMeta.tx.hash, 'result log matches tx hash');
  cb();
},
function filterChangesTwo(t, testMeta, response, cb) {
  const results = response.result;
  t.equal(results.length, 0, 'correct number of results');
  cb();
},
);

filterTest('log filter - mixed case', {
  method: 'eth_newFilter',
  params: [{
    address: '0x00000000000000000000000000000000aAbBcCdD',
    topics: ['0x00000000000000000000000000000000000000000000000000DeadBeefCafe01']
  }]
},
function afterInstall(t, testMeta, response, cb) {
  testMeta.tx = testMeta.blockProvider.addTx({
    hash: '0x0000000000000000000000000000000000000000000000000000000000000001',
    _logAddress: '0x00000000000000000000000000000000AABBCCDD',
    _logTopics: ['0x00000000000000000000000000000000000000000000000000DEADBEEFCAFE01']
  });
  testMeta.badTx = testMeta.blockProvider.addTx({
    _logAddress: '0x00000000000000000000000000000000aAbBcCdD',
    _logTopics: ['0x00000000000000000000000000000000000000000000000000DeadBeefCafe02']
  });
  testMeta.block = testMeta.blockProvider.nextBlock();
  cb();
},
function filterChangesOne(t, testMeta, response, cb) {
  const results = response.result;
  const matchedLog = response.result[0];
  t.equal(results.length, 1, 'correct number of results');
  t.equal(matchedLog && matchedLog.transactionHash, testMeta.tx.hash, 'result log matches tx hash');
  cb();
},
function filterChangesTwo(t, testMeta, response, cb) {
  const results = response.result;
  t.equal(results.length, 0, 'correct number of results');
  cb();
},
);

filterTest('log filter - address array', {
  method: 'eth_newFilter',
  params: [{
    address: [
      '0x00000000000000000000000000000000aAbBcCdD',
      '0x00000000000000000000000000000000a1b2c3d4'],
    topics: ['0x00000000000000000000000000000000000000000000000000DeadBeefCafe01']
  }]
},
function afterInstall(t, testMeta, response, cb) {
  testMeta.tx = testMeta.blockProvider.addTx({
    hash: '0x0000000000000000000000000000000000000000000000000000000000000001',
    _logAddress: '0x00000000000000000000000000000000AABBCCDD',
    _logTopics: ['0x00000000000000000000000000000000000000000000000000DEADBEEFCAFE01']
  });
  testMeta.badTx = testMeta.blockProvider.addTx({
    _logAddress: '0x00000000000000000000000000000000aAbBcCdD',
    _logTopics: ['0x00000000000000000000000000000000000000000000000000DeadBeefCafe02']
  });
  testMeta.block = testMeta.blockProvider.nextBlock();
  cb();
},
function filterChangesOne(t, testMeta, response, cb) {
  const results = response.result;
  const matchedLog = response.result[0];
  t.equal(results.length, 1, 'correct number of results');
  t.equal(matchedLog && matchedLog.transactionHash, testMeta.tx.hash, 'result log matches tx hash');
  cb();
},
function filterChangesTwo(t, testMeta, response, cb) {
  const results = response.result;
  t.equal(results.length, 0, 'correct number of results');
  cb();
},
);

filterTest('log filter - and logic', {
  method: 'eth_newFilter',
  params: [{
    topics: [
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe01',
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe02'
    ]
  }]
},
function afterInstall(t, testMeta, response, cb) {
  testMeta.tx = testMeta.blockProvider.addTx({
    hash: '0x0000000000000000000000000000000000000000000000000000000000000001',
    _logTopics: [
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe01',
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe02'
    ]
  });
  testMeta.badTx = testMeta.blockProvider.addTx({
    _logTopics: [
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe02',
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe01'
    ]
  });
  testMeta.block = testMeta.blockProvider.nextBlock();
  cb();
},
function filterChangesOne(t, testMeta, response, cb) {
  const results = response.result;
  const matchedLog = response.result[0];
  t.equal(results.length, 1, 'correct number of results');
  t.equal(matchedLog && matchedLog.transactionHash, testMeta.tx.hash, 'result log matches tx hash');
  cb();
},
function filterChangesTwo(t, testMeta, response, cb) {
  const results = response.result;
  t.equal(results.length, 0, 'correct number of results');
  cb();
},
);

filterTest('log filter - or logic', {
  method: 'eth_newFilter',
  params: [{
    topics: [
      [
        '0x00000000000000000000000000000000000000000000000000deadbeefcafe01',
        '0x00000000000000000000000000000000000000000000000000deadbeefcafe02'
      ]
    ]
  }]
},
function afterInstall(t, testMeta, response, cb) {
  testMeta.tx1 = testMeta.blockProvider.addTx({
    hash: '0x0000000000000000000000000000000000000000000000000000000000000001',
    _logTopics: [
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe01'
    ]
  });
  testMeta.tx2 = testMeta.blockProvider.addTx({
    hash: '0x0000000000000000000000000000000000000000000000000000000000000002',
    _logTopics: [
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe02'
    ]
  });
  testMeta.badTx = testMeta.blockProvider.addTx({
    _logTopics: [
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe03'
    ]
  });
  testMeta.block = testMeta.blockProvider.nextBlock();
  cb();
},
function filterChangesOne(t, testMeta, response, cb) {
  const results = response.result;
  const matchedLog1 = response.result[0];
  const matchedLog2 = response.result[1];
  t.equal(results.length, 2, 'correct number of results');
  t.equal(matchedLog1.transactionHash, testMeta.tx1.hash, 'result log matches tx hash');
  t.equal(matchedLog2.transactionHash, testMeta.tx2.hash, 'result log matches tx hash');
  cb();
},
function filterChangesTwo(t, testMeta, response, cb) {
  const results = response.result;
  t.equal(results.length, 0, 'correct number of results');
  cb();
},
);

filterTest('log filter - wildcard logic', {
  method: 'eth_newFilter',
  params: [{
    topics: [
      null,
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe02'
    ]
  }]
},
function afterInstall(t, testMeta, response, cb) {
  testMeta.tx1 = testMeta.blockProvider.addTx({
    hash: '0x0000000000000000000000000000000000000000000000000000000000000001',
    _logTopics: [
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe01',
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe02'
    ]
  });
  testMeta.tx2 = testMeta.blockProvider.addTx({
    hash: '0x0000000000000000000000000000000000000000000000000000000000000002',
    _logTopics: [
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe02',
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe02'
    ]
  });
  testMeta.badTx = testMeta.blockProvider.addTx({
    _logTopics: [
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe01',
      '0x00000000000000000000000000000000000000000000000000deadbeefcafe01'
    ]
  });
  testMeta.block = testMeta.blockProvider.nextBlock();
  cb();
},
function filterChangesOne(t, testMeta, response, cb) {
  const results = response.result;
  const matchedLog1 = response.result[0];
  const matchedLog2 = response.result[1];
  t.equal(results.length, 2, 'correct number of results');
  t.equal(matchedLog1.transactionHash, testMeta.tx1.hash, 'result log matches tx hash');
  t.equal(matchedLog2.transactionHash, testMeta.tx2.hash, 'result log matches tx hash');
  cb();
},
function filterChangesTwo(t, testMeta, response, cb) {
  const results = response.result;
  t.equal(results.length, 0, 'correct number of results');
  cb();
},
);

filterTest('eth_getFilterLogs called with non log filter id should return []', { method: 'eth_newBlockFilter' },
  function afterInstall(t, testMeta, _, cb) {
    const _block = testMeta.block = testMeta.blockProvider.nextBlock();
    testMeta.engine.once('block', () => {
      testMeta.engine.sendAsync(createPayload({ method: 'eth_getFilterLogs', params: [testMeta.filterId] }), (err, response) => {
        t.ifError(err, 'did not error');
        t.ok(response, 'has response');
        t.ok(response.result, 'has response.result');

        t.equal(testMeta.filterProvider.getWitnessed('eth_getFilterLogs').length, 1, 'filterProvider did see "eth_getFilterLogs');
        t.equal(testMeta.filterProvider.getHandled('eth_getFilterLogs').length, 1, 'filterProvider did handle "eth_getFilterLogs');

        t.equal(response.result.length, 0, 'eth_getFilterLogs returned an empty result for a non log filter');
        cb();
      });
    });
  });

// util

function filterTest(label, filterPayload, afterInstall, filterChangesOne?, filterChangesTwo?) {
  test('filters - ' + label, (t) => {
    // t.plan(8)

    // install filter
    // new block
    // check filter

    const testMeta: any = {};

    // handle "test_rpc"
    const filterProvider = testMeta.filterProvider = injectMetrics(new FilterProvider());
    // handle block requests
    const blockProvider = testMeta.blockProvider = injectMetrics(new TestBlockProvider());

    const engine = testMeta.engine = new ProviderEngine({
      pollingInterval: 20,
      pollingShouldUnref: false
    });
    engine.addProvider(filterProvider);
    engine.addProvider(blockProvider);

    asyncWaterfall([
      // wait for first block
      (cb) => {
        engine.once('block', () => cb());
        engine.start();
      },
      // install block filter
      (cb) => {
        engine.sendAsync(createPayload(filterPayload), cb);
      },
      // validate install
      (response, cb) => {
        t.ok(response, 'has response');

        const method = filterPayload.method;

        t.equal(filterProvider.getWitnessed(method).length, 1, 'filterProvider did see "' + method + '"');
        t.equal(filterProvider.getHandled(method).length, 1, 'filterProvider did handle "' + method + '"');

        testMeta.filterId = response.result;

        afterInstall(t, testMeta, response, cb);
      },
      (cb) => {
        if (filterChangesOne) {
          checkFilterChangesOne(cb);
        } else {
          cb();
        }
      },
      (cb) => {
        if (filterChangesTwo) {
          checkFilterChangesTwo(cb);
        } else {
          cb();
        }
      }
    ], (err) => {
      t.ifError(err, 'did not error');
      engine.stop();
      t.end();
    });

    function checkFilterChangesOne(done) {
      asyncWaterfall([
        // wait next block
        (cb) => {
          engine.once('block', () => cb());
        },
        // check filter one
        (cb) => {
          const filterId = testMeta.filterId;
          engine.sendAsync(createPayload({ method: 'eth_getFilterChanges', params: [filterId] }), cb);
        },
        (response, cb) => {
          t.ok(response, 'has response');

          t.equal(filterProvider.getWitnessed('eth_getFilterChanges').length, 1, 'filterProvider did see "eth_getFilterChanges"');
          t.equal(filterProvider.getHandled('eth_getFilterChanges').length, 1, 'filterProvider did handle "eth_getFilterChanges"');

          filterChangesOne(t, testMeta, response, cb);
        }
      ], done);
    }

    function checkFilterChangesTwo(done) {
      asyncWaterfall([
        // check filter two
        (cb) => {
          const filterId = testMeta.filterId;
          engine.sendAsync(createPayload({ method: 'eth_getFilterChanges', params: [filterId] }), cb);
        },
        (response, cb) => {
          t.ok(response, 'has response');

          t.equal(filterProvider.getWitnessed('eth_getFilterChanges').length, 2, 'filterProvider did see "eth_getFilterChanges"');
          t.equal(filterProvider.getHandled('eth_getFilterChanges').length, 2, 'filterProvider did handle "eth_getFilterChanges"');

          filterChangesTwo(t, testMeta, response, cb);
        }
      ], done);
    }

  });
}
