type CacheElem = {
    key: string;
    entry: any;
    expiry: number;
};

type Entries = {
    [key: string]: CacheElem;
};

export class AsyncCache {
    /**
     * Time to live of an item in the cache (24 hours)
     */
    TTL_24H_IN_MILLIS = 24 * 60 * 60 * 1000;

    // a day in ms
    entries: Entries = {};

    /**
     * Get an entry from the cache, and populate it if missing.
     * @param {string} key - the unique identifier of that item
     * @param {function(string)} fetch - a function that will populated this entry if it is missing.
     * @returns {Promise<any>} a promise to the entry matching the `key`, or a rejected promise if not found.
     */
    get(key: string, fetch) {
        if (!this.entries[key]) {
            this.add(key, fetch(key));
        }
        return this.entries[key].entry;
    }

    /**
     * Add an entry to the cache.
     * @param {string} key - the unique identifier of that item.
     * @param {Promise<any>} entry - a Promise of the entry to be added to the cache.
     */
    add(key: string, value) {
        this.entries[key] = {
            key,
            entry: typeof value.then === 'function' ? value : Promise.resolve(value),
            expiry: Date.now() + this.TTL_24H_IN_MILLIS,
        };
        this.clean();
    }

    /**
     *
     * @param {string} key - voids an entry in the cache.
     */
    remove(key: string) {
        delete this.entries[key];
    }

    /**
     * Remove stale entries from the cache
     */
    clean() {
        const now = Date.now();
        this.entries = Object.entries(this.entries).reduce((freshEntries, [key, entry]) => {
            if (entry.expiry > now) {
                return { ...freshEntries, [key]: entry };
            }
            return freshEntries;
        }, {});
    }
}
