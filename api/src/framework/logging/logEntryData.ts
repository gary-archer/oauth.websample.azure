import {ApiError} from '../errors/apiError';
import {IClientError} from '../extensibility/iclientError';
import {PerformanceBreakdown} from './performanceBreakdown';

/*
 * Each API request writes a structured log entry containing fields we will query by
 * It also writes JSON blobs whose fields are not designed to be queried
 */
export class LogEntryData {

    // The time when the API received the request
    public utcTime: Date;

    // The name of the API
    public apiName: string;

    // The operation called
    public operationName: string;

    // The server on which the request was processed
    public serverName: string;

    // The HTTP verb
    public requestVerb: string;

    // The request path
    public requestPath: string;

    // The calling application
    public clientId: string;

    // The calling user, for secured requests
    public userId: string;

    // The calling user name, for secured requests
    public userName: string;

    // The status code returned
    public statusCode: number;

    // The time taken in API code
    public millisecondsTaken: number;

    // A time beyond which performance is considered 'slow'
    public performanceThresholdMilliseconds: number;

    // The error code for requests that failed
    public errorCode: string;

    // The specific error instance id, for 500 errors
    public errorId: number;

    // The correlation id, used to link related API requests together
    public correlationId: string;

    // A batch id, used in batch scenarios such as performance tests
    public batchId: string;

    // An object containing performance data, written when performance is slow
    public performance: PerformanceBreakdown;

    // An object containing error data, written for failed requests
    public errorData: ApiError | IClientError | null;

    // Can be populated in scenarios when extra text is useful
    public infoData: string[];

    /*
     * Give fields default values
     */
    public constructor() {

        // Queryable fields
        this.utcTime = new Date();
        this.apiName = '';
        this.operationName = '';
        this.serverName = '';
        this.requestVerb = '';
        this.requestPath = '';
        this.clientId = '';
        this.userId = '';
        this.userName = '';
        this.statusCode = 0;
        this.millisecondsTaken = 0;
        this.performanceThresholdMilliseconds = 0;
        this.errorCode = '';
        this.errorId = 0;
        this.correlationId = '';
        this.batchId = '';

        // Objects
        this.performance = new PerformanceBreakdown('total');
        this.errorData = null;
        this.infoData = [];
    }

    /*
     * Produce the output format
     */
    public toLogFormat() {
        const data: any = {};

        // Add fields which will be used as top level queryable columns
        this._outputString((x) => data.utcTime = x, this.utcTime.toISOString());
        this._outputString((x) => data.apiName = x, this.apiName);
        this._outputString((x) => data.operationName = x, this.operationName);
        this._outputString((x) => data.serverName = x, this.serverName);
        this._outputString((x) => data.requestVerb = x, this.requestVerb);
        this._outputString((x) => data.requestPath = x, this.requestPath);
        this._outputString((x) => data.clientId = x, this.clientId);
        this._outputString((x) => data.userId = x, this.userId);
        this._outputString((x) => data.userName = x, this.userName);
        this._outputNumber((x) => data.statusCode = x, this.statusCode);
        this._outputNumber((x) => data.millisecondsTaken = x, this.performance.millisecondsTaken);
        this._outputNumber((x) => data.millisecondsThreshold = x, this.performanceThresholdMilliseconds);
        this._outputString((x) => data.errorCode = x, this.errorCode);
        this._outputNumber((x) => data.errorId = x, this.errorId);
        this._outputString((x) => data.correlationId = x, this.correlationId);
        this._outputString((x) => data.batchId = x, this.batchId);

        // Add more detailed data, which will be looked up via top level fields
        this._outputPerformance(data);
        this._outputError(data);
        this._outputInfo(data);
        return data;
    }

    /*
     * Indicate whether an error entry
     */
    public isError() {
        return this.errorData !== null;
    }

    /*
     * Add a string to the output
     */
    private _outputString(setter: (val: string) => void, value: string): void {
        if (value.length > 0) {
            setter(value);
        }
    }

    /*
     * Add a number to the output
     */
    private _outputNumber(setter: (val: number) => void, value: number): void {
        if (value > 0) {
            setter(value);
        }
    }

    /*
     * Add the performance breakdown if the theshold has been exceeded
     */
    private _outputPerformance(data: any): void {
        if (this.performance.millisecondsTaken > this.performanceThresholdMilliseconds) {
            data.performanceData = this.performance.data;
        }
    }

    /*
     * Add error details if applicable
     */
    private _outputError(data: any): void {
        if (this.errorData !== null && this.statusCode !== 401) {

            // Get the error data in its log format
            const loggedError = this.errorData.toLogFormat();

            // First output denormalised fields that can be queried by
            if (loggedError.clientError.code) {
                data.errorCode = loggedError.clientError.code;
            }
            if (loggedError.clientError.id) {
                data.errorId = loggedError.clientError.id;
            }

            // Next output the full error object
            data.errorData = this.errorData.toLogFormat();
        }
    }

    /*
     * Add info details if applicable
     */
    private _outputInfo(data: any): void {
        if (this.infoData.length > 0) {
            data.infoData = this.infoData;
        }
    }
}
