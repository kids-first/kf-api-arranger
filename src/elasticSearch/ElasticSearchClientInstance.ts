import { Client } from '@elastic/elasticsearch';

import { esHost } from '../env';

class EsInstance {
    private instance: Client;
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
