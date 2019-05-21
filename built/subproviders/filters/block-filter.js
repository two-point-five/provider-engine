import Filter from './filter';
//
// BlockFilter
//
export default class BlockFilter extends Filter {
    constructor(opts) {
        // console.log('BlockFilter - new')
        super();
        this.type = 'block';
        this.engine = opts.engine;
        this.blockNumber = opts.blockNumber;
        this.updates = [];
    }
    update(block) {
        // console.log('BlockFilter - update')
        const blockHash = bufferToHex(block.hash);
        this.updates.push(blockHash);
        this.emit('data', block);
    }
    getChanges() {
        // console.log('BlockFilter - getChanges:', results.length)
        return this.updates;
    }
    clearChanges() {
        // console.log('BlockFilter - clearChanges')
        this.updates = [];
    }
}
function bufferToHex(buffer) {
    return '0x' + buffer.toString('hex');
}
