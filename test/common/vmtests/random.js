var testData = require('../../../../tests/vmtests/random.json'),
  async = require('async'),
  VM = require('../../../lib/vm'),
  Account = require('../../../lib/account.js'),
  Block = require('../../../lib/block.js'),
  testUtils = require('../../testUtils'),
  assert = require('assert'),
  levelup = require('levelup'),
  Trie = require('merkle-patricia-tree');

var internals = {},
  stateDB = levelup('', {
      db: require('memdown')
  });

internals.state = new Trie(stateDB);
testData = testData.random;

describe('[Common]: VM tests', function () {

  describe('random.json', function () {
    it('setup the trie', function (done) {
      var keysOfPre = Object.keys(testData.pre),
        acctData,
        account;

      async.each(keysOfPre, function(key, callback) {
        acctData = testData.pre[key];

        account = new Account();
        account.nonce = testUtils.fromDecimal(acctData.nonce);
        account.balance = testUtils.fromDecimal(acctData.balance);
        internals.state.put(new Buffer(key, 'hex'), account.serialize(), callback);
      }, done);
    });

    it('run code', function(done) {
      var env = testData.env,
        block = new Block(),
        acctData,
        account;

      block.header.timestamp = testUtils.fromDecimal(env.currentTimestamp);
      block.header.gasLimit = testUtils.fromDecimal(env.currentGasLimit);
      block.header.parentHash = new Buffer(env.previousHash, 'hex');
      block.header.coinbase = new Buffer(env.currentCoinbase, 'hex');
      block.header.difficulty = testUtils.fromDecimal(env.currentDifficulty);
      block.header.number = testUtils.fromDecimal(env.currentNumber);

      acctData = testData.pre[testData.exec.address];
      account = new Account();
      account.nonce = testUtils.fromDecimal(acctData.nonce);
      account.balance = testUtils.fromDecimal(acctData.balance);

      var vm = new VM(internals.state);
      vm.runCode({
        account: account,
        origin: new Buffer(testData.exec.origin, 'hex'),
        code:  new Buffer(testData.exec.code.slice(2), 'hex'),  // slice off 0x
        value: testUtils.fromDecimal(testData.exec.value),
        address: new Buffer(testData.exec.address, 'hex'),
        from: new Buffer(testData.exec.caller, 'hex'),
        data:  new Buffer(testData.exec.data.slice(2), 'hex'),  // slice off 0x
        gasLimit: testData.exec.gas,
        block: block
      }, function(err, results) {
        assert(!err);
        assert(results.gasUsed.toNumber() === (testData.exec.gas - testData.gas));
        done();
      });
    });
  });
});
