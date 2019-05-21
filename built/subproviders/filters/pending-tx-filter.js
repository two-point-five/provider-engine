import Filter from './filter';
//
// PendingTxFilter
//
export default class PendingTransactionFilter extends Filter {
    constructor() {
        // console.log('PendingTransactionFilter - new')
        super();
        this.type = 'pendingTx';
        this.updates = [];
        this.allResults = [];
    }
    update(txs) {
        // console.log('PendingTransactionFilter - update')
        const validTxs = [];
        txs.forEach((tx) => {
            // validate filter match
            const validated = this.validateUnique(tx);
            if (!validated) {
                return;
            }
            // add to results
            validTxs.push(tx);
            this.updates.push(tx);
            this.allResults.push(tx);
        });
        if (validTxs.length > 0) {
            this.emit('data', validTxs);
        }
    }
    getChanges() {
        // console.log('PendingTransactionFilter - getChanges')
        return this.updates;
    }
    getAllResults() {
        // console.log('PendingTransactionFilter - getAllResults')
        return this.allResults;
    }
    clearChanges() {
        // console.log('PendingTransactionFilter - clearChanges')
        this.updates = [];
    }
    validateUnique(tx) {
        return this.allResults.indexOf(tx) === -1;
    }
}
