export class S3Error extends Error {
    public readonly details: unknown;

    constructor(details: unknown) {
        super(`S3 Client returns an error`);
        Object.setPrototypeOf(this, S3Error.prototype);
        this.name = S3Error.name;
        this.details = details;
    }
}
