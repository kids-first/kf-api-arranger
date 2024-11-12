export class MissingFilterError extends Error {
    constructor() {
        super('Missing filter in request.');
        Object.setPrototypeOf(this, MissingFilterError.prototype);
        this.name = MissingFilterError.name;
    }
}
