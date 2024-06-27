export class UserApiError extends Error {
    public readonly status: number;
    public readonly details: unknown;

    constructor(status: number, details: unknown) {
        super(`UserApi returns status ${status}`);
        Object.setPrototypeOf(this, UserApiError.prototype);
        this.name = UserApiError.name;
        this.status = status;
        this.details = details;
    }
}
