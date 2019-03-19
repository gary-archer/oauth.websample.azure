/*
 * A range for random error ids
 */
import {ClientError} from './clientError';
const MIN_ERROR_ID = 10000;
const MAX_ERROR_ID = 99999;

/*
 * An error entity that the API will log
 */
export class ApiError extends Error {

    /*
     * Error properties
     */
    private readonly _statusCode: number;
    private readonly _apiName: string;
    private readonly _errorCode: string;
    private readonly _instanceId: number;
    private readonly _utcTime: string;
    private _details: string;

    /*
     * Errors are categorized by error code
     */
    public constructor(apiName: string, errorCode: string, userMessage: string) {

        super(userMessage);

        // Give fields their default values
        this._statusCode = 500;
        this._apiName = apiName;
        this._errorCode = errorCode;
        this._instanceId = Math.floor(Math.random() * (MAX_ERROR_ID - MIN_ERROR_ID + 1) + MIN_ERROR_ID),
        this._utcTime = new Date().toISOString(),
        this._details = '';

        // Ensure that instanceof works
        Object.setPrototypeOf(this, new.target.prototype);
    }

    public get details(): string {
        return this._details;
    }

    public set details(details: string) {
        this._details = details;
    }

    /*
     * Return an object ready to log
     */
    public toLogFormat(): any {

        const serviceError: any = {
            details: this._details,
        };

        // Include the stack trace as an array within the JSON object
        if (this.stack) {
            serviceError.stack = this.stack.split('\n').map((x) => x.trim());
        }

        return {
            statusCode: this._statusCode,
            clientError: this.toClientError().toResponseFormat(),
            serviceError,
        };
    }

    /*
     * Translate to a supportable error response to return to the API caller
     * API 500 errors use the default type of client error
     */
    public toClientError(): ClientError {

        // Set a generic client error code for the server exception
        const error = new ClientError(this._statusCode, this._errorCode, this.message);

        // Also indicate which API, where in logs and when the error occurred
        error.setExceptionDetails(this._apiName, this._instanceId, this._utcTime);
        return error;
    }
}
