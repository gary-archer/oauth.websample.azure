import {NextFunction, Request, Response} from 'express';
import {Logger} from 'winston';
import {FrameworkConfiguration} from '../configuration/frameworkConfiguration';
import {FRAMEWORKTYPES} from '../configuration/frameworkTypes';
import {ILoggerFactory} from '../extensibility/iloggerFactory';
import {LogEntry} from '../logging/logEntry';
import {HttpContextAccessor} from '../utilities/httpContextAccessor';
import {ResponseWriter} from '../utilities/responseWriter';
import {ApiError} from './apiError';
import {ExceptionHelper} from './exceptionHelper';

/*
 * The entry point for catching exceptions during API calls
 */
export class UnhandledExceptionHandler {

    private readonly _configuration: FrameworkConfiguration;
    private readonly _contextAccessor: HttpContextAccessor;
    private readonly _logger: Logger;

    /*
     * Receive dependencies
     */
    public constructor(
        configuration: FrameworkConfiguration,
        contextAccessor: HttpContextAccessor,
        loggerFactory: ILoggerFactory) {

        this._configuration = configuration;
        this._contextAccessor = contextAccessor;
        this._logger = loggerFactory.getProductionLogger();
        this._setupCallbacks();
    }

    /*
     * Process any exceptions from controllers
     */
    public handleException(exception: any, request: Request, response: Response, next: NextFunction): void {

        // Get the error into a known object
        const error = ExceptionHelper.fromException(exception, this._configuration.apiName);

        // Get the log entry for this API request and add error details to it
        // The error will be logged by the logging middleware later
        const httpContext = this._contextAccessor.getHttpContext(request);
        const logEntry = httpContext.container.get<LogEntry>(FRAMEWORKTYPES.LogEntry);
        logEntry.setError(error);

        // Get the error to return to the client
        const clientError = (error instanceof ApiError) ? error.toClientError() : error;

        // Write the client response
        const writer = new ResponseWriter();
        writer.writeObjectResponse(response, clientError.getStatusCode(), clientError.toResponseFormat());
    }

    /*
     * Plumbing to ensure the this parameter is available
     */
    private _setupCallbacks(): void {
        this.handleException = this.handleException.bind(this);
    }
}
