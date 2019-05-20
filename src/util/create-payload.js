import { createRandomId } from './random-id.js';
import extend from 'xtend';

export function createPayload(data){
  return extend({
    // defaults
    id: createRandomId(),
    jsonrpc: '2.0',
    params: [],
    // user-specified
  }, data);
}
