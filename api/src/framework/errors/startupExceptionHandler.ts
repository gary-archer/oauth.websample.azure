import {Logger} from 'winston';
import {ILoggerFactory} from '../extensibility/iloggerFactory';
import {ExceptionHelper} from './exceptionHelper';

/*
 * Handle exceptions during application startup exceptions
 */
export class StartupExceptionHandler {

    private readonly _logger: Logger;

    public constructor(loggerFactory: ILoggerFactory) {
        this._logger = loggerFactory.getProductionLogger();
    }

    /*
     * Handle errors at application startup, such as those downloading metadata
     * Write a log entry with just the error object populated
     */
    public handleStartupException(apiName: string, exception: any): void {
        const error = ExceptionHelper.fromException(exception, apiName);
        const logEntry = {
            error: error.toLogFormat(),
        };
        this._logger.error(logEntry);
    }
}
