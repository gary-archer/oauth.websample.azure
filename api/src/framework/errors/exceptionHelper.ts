import {IClientError} from '../extensibility/iclientError';
import {ApiError} from './apiError';

/*
 * Exception utilities
 */
export class ExceptionHelper {

    /*
     * Return or create a typed error from a general exception
     */
    public static fromException(exception: any, apiName: string): ApiError | IClientError {

        // Already handled API errors
        const apiError = this.tryConvertToApiError(exception);
        if (apiError !== null) {
            return apiError;
        }

        const clientError = this.tryConvertToClientError(exception);
        if (clientError !== null) {
            return clientError;
        }

        // Caught exceptions
        const error = new ApiError(apiName, 'server_error', 'An unexpected exception occurred in the API');
        error.details = ExceptionHelper.getExceptionDetails(exception);
        error.stack = exception.stack;
        return error;
    }

    /*
     * Try to convert an exception to a known type
     */
    public static tryConvertToApiError(exception: any): ApiError | null {

        if (exception instanceof ApiError) {
            return exception as ApiError;
        }

        return null;
    }

    /*
     * Try to convert an exception to an interface
     * We have to use a TypeScript specific method of checking for known members
     */
    public static tryConvertToClientError(exception: any): IClientError | null {

        if (exception.getStatusCode && exception.toResponseFormat && exception.toLogFormat) {
            return exception as IClientError;
        }

        return null;
    }

    /*
     * Given an exception try to return a good string representation
     */
    public static getExceptionDetails(exception: any): string {

        if (exception.message) {
            return exception.message;
        } else {
            return exception.toString();
        }
    }
}
