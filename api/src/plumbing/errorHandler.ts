import {ApiError} from './apiError';
import {ApiLogger} from './apiLogger';
import {ClientError} from './clientError';

/*
 * A class to handle composing and reporting errors
 */
export class ErrorHandler {

    /*
     * Handle the server error and get client details
     */
    public static handleError(exception: any): ClientError {

        // Ensure that the exception has a known type
        const handledError = ErrorHandler.fromException(exception);
        if (exception instanceof ClientError) {

            // Client errors mean the caller did something wrong
            const clientError = handledError as ClientError;

            // Log the error
            const errorToLog = clientError.toLogFormat();
            ApiLogger.error(JSON.stringify(errorToLog));

            // Return the API response to the caller
            return clientError;

        } else {

            // API errors mean we experienced a failure
            const apiError = handledError as ApiError;

            // Log the error with an id
            const errorToLog = apiError.toLogFormat();
            ApiLogger.error(JSON.stringify(errorToLog));

            // Return the API response to the caller
            return apiError.toClientError();
        }
    }

    /*
     * Ensure that all errors are of a known type
     */
    public static fromException(exception: any): ApiError | ClientError {

        // Already handled 500 errors
        if (exception instanceof ApiError) {
            return exception;
        }

        // Already handled 4xx errors
        if (exception instanceof ClientError) {
            return exception;
        }

        // Well coded errors should derive from this base class
        if (exception instanceof Error) {

            const apiError = new ApiError({
                message: `Problem encountered`,
                area: 'Exception',
                details: exception.message,
            });
            apiError.stack = exception.stack;
            return apiError;
        }

        // For other errors we just call toString
        return new ApiError({
            message: 'Problem encountered',
            area: 'Exception',
            details: exception.toString(),
        });
    }

    /*
     * Handle the error for metadata lookup failures
     */
    public static fromMetadataError(responseError: any, url: string): ApiError {

        return new ApiError({
            statusCode: 500,
            area: 'Metadata Lookup',
            url,
            message: 'Metadata lookup failed',
            details: responseError,
        });
    }

    /*
     * Handle the error for download failures
     */
    public static fromSigningKeysDownloadError(responseError: any, url: string): ApiError {

        return new ApiError({
            statusCode: 500,
            area: 'Signing Keys Download',
            url,
            message: 'Signing keys download failed',
            details: responseError,
        });
    }
}
