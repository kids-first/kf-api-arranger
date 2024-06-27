/* eslint-disable no-console */
import { Client } from '@elastic/elasticsearch';

import { esHost, esPass, esUser } from './env';

class EsInstance {
    private instance: Client;
    constructor() {
        if (!this.instance) {
            if (esUser && esPass) {
                this.instance = new Client({ node: esHost, auth: { username: esUser, password: esPass } });
            } else {
                this.instance = new Client({ node: esHost });
            }
        }
    }

    getInstance() {
        return this.instance;
    }
}

const singletonEsInstance = new EsInstance();

Object.freeze(singletonEsInstance);

export default singletonEsInstance;
