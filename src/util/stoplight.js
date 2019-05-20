import { EventEmitter } from 'events';

export default class Stoplight extends EventEmitter {

  constructor() {
    super();
    const self = this;
    self.isLocked = true;
  }

  go(){
    const self = this;
    self.isLocked = false;
    self.emit('unlock');
  }

  stop(){
    const self = this;
    self.isLocked = true;
    self.emit('lock');
  }

  await(fn){
    const self = this;
    if (self.isLocked) {
      self.once('unlock', fn);
    } else {
      setTimeout(fn);
    }
  }
}
