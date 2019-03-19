import {Request, Response} from 'express';
import {injectable} from 'inversify';
import * as os from 'os';
import {Logger} from 'winston';
import {ApiError} from '../errors/apiError';
import {IClientError} from '../extensibility/iclientError';
import {CoreApiClaims} from '../security/coreApiClaims';
import {LogEntryData} from './logEntryData';
import {PerformanceBreakdown} from './performanceBreakdown';

/*
 * Each API request writes a structured log entry containing fields we will query by
 * This class contains the behaviour and can be injected into business logic if required
 */
@injectable()
export class LogEntry {

    private _data: LogEntryData;

    /*
     * Initialise data
     */
    public constructor(apiName: string, performanceThresholdMilliseconds: number) {
        this._data = new LogEntryData();
        this._data.apiName = apiName;
        this._data.performanceThresholdMilliseconds = performanceThresholdMilliseconds;
    }

    /*
     * Start collecting data before calling the API's business logic
     */
    public start(request: Request) {

        // Read request details
        this._data.serverName = os.hostname();
        this._data.requestVerb = request.method;
        this._data.requestPath = request.originalUrl;

        // Read optional headers used for correlation
        const correlationId = request.header('x-mycompany-correlation-id');
        if (correlationId) {
            this._data.correlationId = correlationId;
        }
        const batchId = request.header('x-mycompany-batch-id');
        if (batchId) {
            this._data.batchId = batchId;
        }
    }

    /*
     * Add identity details for secured requests
     */
    public setIdentity(claims: CoreApiClaims): void {
        this._data.clientId = claims.clientId;
        this._data.userId = claims.userId;
        this._data.userName = `${claims.givenName} ${claims.familyName}`;
    }

    /*
     * Allow consumers to add to the log entry's performance breakdown
     */
    public createPerformanceBreakdown(name: string): PerformanceBreakdown {
        return this._data.performance.createChild(name);
    }

    /*
     * Add error details after they have been processed by the exception handler
     */
    public setError(error: ApiError | IClientError): void {
        this._data.errorData = error;
    }

    /*
     * Enable free text to be added to production logs, though this should be avoided in most cases
     */
    public addInfo(info: string): void {
        this._data.infoData.push(info);
    }

    /*
     * Finish logging after calling the API's business logic
     */
    public write(response: Response, logger: Logger) {

        // Get data from the response object
        this._end(response);

        // Get the object to log
        const logData = this._data.toLogFormat();

        // Output it
        if (this._data.isError()) {
            logger.error(logData);
        } else {
            logger.info(logData);
        }
    }

    /*
     * Finish collecting data when all API processing is finished
     */
    private _end(response: Response) {

        // Finish performance measurements
        this._data.performance.dispose();

        // Record response details
        this._data.statusCode = response.statusCode;
    }
}
