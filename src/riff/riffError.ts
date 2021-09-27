export class RiffError extends Error {
    public readonly status: number;
    public readonly details: unknown;

    constructor(status: number, details: unknown) {
        super(`Riff returns status ${status}`);
        Object.setPrototypeOf(this, RiffError.prototype);
        this.name = RiffError.name;
        this.status = status;
        this.details = details;
    }
}
