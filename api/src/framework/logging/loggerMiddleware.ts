import {NextFunction, Request, Response} from 'express';
import {Logger} from 'winston';
import {FRAMEWORKTYPES} from '../configuration/frameworkTypes';
import {ILoggerFactory} from '../extensibility/iloggerFactory';
import {HttpContextAccessor} from '../utilities/httpContextAccessor';
import {LogEntry} from './logEntry';

/*
 * A class to log API requests as JSON objects so that we get structured logging output
 */
export class LoggerMiddleware {

    private readonly _contextAccessor: HttpContextAccessor;
    private readonly _logger: Logger;

    /*
     * Receive dependencies
     */
    public constructor(contextAccessor: HttpContextAccessor, loggerFactory: ILoggerFactory) {
        this._contextAccessor = contextAccessor;
        this._logger = loggerFactory.getProductionLogger();
        this._setupCallbacks();
    }

    /*
     * Log one API request
     */
    public logRequest(request: Request, response: Response, next: NextFunction): void {

        // Start the log entry for this API request
        const httpContext = this._contextAccessor.getHttpContext(request);
        const logEntry = httpContext.container.get<LogEntry>(FRAMEWORKTYPES.LogEntry);
        logEntry.start(request);

        // Register it against this request's child container so that it can be injected into controllers
        httpContext.container.bind<LogEntry>(FRAMEWORKTYPES.LogEntry).toConstantValue(logEntry);

        // Finish the log entry when the log event fires
        response.on('finish', () => {
            logEntry.write(response, this._logger);
        });

        next();
    }

    /*
     * Plumbing to ensure the this parameter is available
     */
    private _setupCallbacks(): void {
        this.logRequest = this.logRequest.bind(this);
    }
}
