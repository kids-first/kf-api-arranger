import { esHost } from './env';
import { Client } from '@elastic/elasticsearch';

class EsInstance {
  constructor() {
    if (!this.instance) {
      this.instance = new Client({ node: esHost });
    }
  }

  getInstance() {
    return this.instance;
  }
}

const singletonEsInstance = new EsInstance();

Object.freeze(singletonEsInstance);

export default singletonEsInstance;
