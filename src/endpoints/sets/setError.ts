export class SetNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, SetNotFoundError.prototype);
        this.name = SetNotFoundError.name;
    }
}
