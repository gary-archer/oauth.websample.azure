import {ServerError} from '../../logic/errors/serverError';
import {ClientError} from '../../logic/errors/clientError';
import {ErrorCodes} from '../../logic/errors/errorCodes';

/*
 * A class to handle trapping errors
 */
export class ErrorFactory {

    /*
     * Ensure that all errors used by business logic have a known type
     */
    public static fromException(exception: any): ServerError | ClientError {

        // Already handled 500 errors
        if (exception instanceof ServerError) {
            return exception;
        }

        // Already handled 4xx errors
        if (exception instanceof ClientError) {
            return exception;
        }

        // Handle general exceptions
        return ErrorFactory.fromServerError(exception);
    }

    /*
     * Process exception details
     */
    public static fromServerError(exception: any): ServerError {

        const serverError = new ServerError(
            ErrorCodes.serverError,
            'An unexpected exception occurred in the API',
            exception.stack);
        serverError.details = this._getExceptionDetails(exception);
        return serverError;
    }

    /*
     * Handle requests to API routes that don't exist
     */
    public static fromRequestNotFound(): ClientError {

        return new ClientError(
            404,
            ErrorCodes.requestNotFound,
            'An API request was sent to a route that does not exist');
    }

    /*
     * Handle the error for key identifier lookups
     */
    public static fromJwksDownloadError(e: any, url: string): ServerError {

        const error = new ServerError(
            ErrorCodes.jwksDownloadError,
            'Problem downloading token signing keys',
            e.stack);

        const details = this._getExceptionDetails(e);
        error.details = `${details}, URL: ${url}`;
        return error;
    }

    /*
     * Handle user info lookup failures
     */
    public static fromUserInfoError(e: any, url: string): ServerError | ClientError {

        // Avoid reprocessing
        if (e instanceof ServerError) {
            return e;
        }

        // Collect the parts of the error, including the standard OAuth error / error_description fields
        let status = 0;
        if (e.response && e.response.status) {
            status = e.response.status;
        }

        let responseData: any = {};
        if (e.response && e.response.data && typeof e.response.data === 'object') {
            responseData = e.response.data;
        }

        console.log(responseData);

        // Parse the message and Azure AD does not use the standard error / error_description fields
        const parts: string[] = [];
        parts.push('User info lookup failed');
        if (status) {
            parts.push(`Status: ${status}`);
        }
        if (responseData.error && responseData.error.code) {
            parts.push(`Code: ${responseData.error.code}`);
        }
        if (responseData.error && responseData.error.message) {
            parts.push(`Description: ${responseData.error.message}`);
        }
        parts.push(`URL: ${url}`);
        const details = parts.join(', ');

        // Report 401 errors where the access token is rejected
        if (status == 401) {
            return ClientError.create401(details);
        }

        // Otherwise report technical failures
        const error = new ServerError(ErrorCodes.userinfoFailure, 'User info lookup failed', e.stack);
        error.details = details;
        return error;
    }

    /*
     * The error thrown if we cannot find an expected claim during OAuth processing
     */
    public static fromMissingClaim(claimName: string): ServerError {

        const error = new ServerError(ErrorCodes.claimsFailure, 'Authorization Data Not Found');
        error.details = `An empty value was found for the expected claim ${claimName}`;
        return error;
    }

    /*
     * Get the message from an exception and avoid returning [object Object]
     */
    private static _getExceptionDetails(e: any): string {

        if (e.message) {
            return e.message;
        }

        const details = e.toString();
        if (details !== {}.toString()) {
            return details;
        }

        return '';
    }
}
