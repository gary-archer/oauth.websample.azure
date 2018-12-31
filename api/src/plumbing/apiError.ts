/*
 * A range for random error ids
 */
import {ClientError} from './clientError';
const MIN_ERROR_ID = 10000;
const MAX_ERROR_ID = 99999;

/*
 * Manage errors due to API failures
 */
export class ApiError extends Error {

    /*
     * Fields
     */
    private _statusCode: number;
    private _area: string;
    private _instanceId: number;
    private _url: string;
    private _time: string;
    private _details: string;

    /*
     * Let callers supply a subset of named parameters via object destructuring
     */
    public constructor({
        message = '',
        statusCode = 500,
        area = '',
        instanceId = Math.floor(Math.random() * (MAX_ERROR_ID - MIN_ERROR_ID + 1) + MIN_ERROR_ID),
        url = '',
        time = new Date().toUTCString(),
        details = '',
    }) {

        super(message);

        // Ensure that instanceof works
        Object.setPrototypeOf(this, new.target.prototype);

        this._statusCode = statusCode;
        this._area = area;
        this._instanceId = instanceId;
        this._url = url;
        this._time = time;
        this._details = details;
    }

    public get statusCode(): number {
        return this._statusCode;
    }

    public get area(): string {
        return this._area;
    }

    public set area(area) {
        this._area = area;
    }

    get instanceId() {
        return this._instanceId;
    }

    public get url(): string {
        return this._url;
    }

    get time() {
        return this._time;
    }

    public get details(): string {
        return this._details;
    }

    public set details(details) {
        this._details = details;
    }

    /*
     * Ensure that the stack trace is included in the logged error
     */
    public toLogFormat(): any {

        return {
            statusCode: this._statusCode,
            message: this.message,
            area: this.area,
            instanceId: this._instanceId,
            time: this._time,
            url: this._url,
            details: this.details,
            stackTrace: this.stack,
        };
    }

    /*
     * Convert to client fields
     */
    public toClientError(): ClientError {

        const error = new ClientError(this._statusCode, this._area, this.message);
        error.id = this._instanceId;
        return error;
    }
}
