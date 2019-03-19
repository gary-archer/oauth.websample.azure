import {FrameworkConfiguration} from '../configuration/frameworkConfiguration';
import {ApiError} from './apiError';
import {ExceptionHelper} from './exceptionHelper';

/*
 * OAuth specific error processing
 */
export class OAuthErrorHandler {

    private readonly _configuration: FrameworkConfiguration;

    public constructor(configuration: FrameworkConfiguration) {
        this._configuration = configuration;
    }

    /*
     * Handle the request promise error for metadata lookup failures
     */
    public fromMetadataError(responseError: any, url: string): ApiError {

        const apiError = new ApiError(
            this._configuration.apiName,
            'metadata_lookup_failure',
            'Metadata lookup failed');
        apiError.details = this._getErrorDetails(null, responseError, url);
        return apiError;
    }

    /*
     * Handle the request promise error for introspection failures
     */
    public fromIntrospectionError(responseError: any, url: string): ApiError {

        if (responseError instanceof ApiError) {
            return responseError;
        }

        const [code, description] = this._readOAuthErrorResponse(responseError);
        const apiError = this._createOAuthApiError('introspection_failure', 'Token validation failed', code);
        apiError.details = this._getErrorDetails(description, responseError, url);
        return apiError;
    }

    /*
     * Handle user info lookup failures
     */
    public fromUserInfoError(responseError: any, url: string): ApiError {

        if (responseError instanceof ApiError) {
            return responseError;
        }

        const [code, description] = this._readOAuthErrorResponse(responseError);
        const apiError = this._createOAuthApiError('userinfo_failure', 'User info lookup failed', code);
        apiError.details = this._getErrorDetails(description, responseError, url);
        return apiError;
    }

    /*
     * The error thrown if we cannot find an expected claim during OAuth processing
     */
    public fromMissingClaim(claimName: string): ApiError {

        const apiError = new ApiError(
            this._configuration.apiName,
            'claims_failure',
            'Authorization Data Not Found');
        apiError.details = `An empty value was found for the expected claim ${claimName}`;
        return apiError;
    }

    /*
     * Return the error and error_description fields from an OAuth error message if present
     */
    private _readOAuthErrorResponse(responseError: any): [string | null, string | null] {

        let code = null;
        let description = null;

        if (responseError.error) {
            code = responseError.error;
        }

        if (responseError.error_description) {
            description = responseError.error_description;
        }

        return [code, description];
    }

    /*
     * Create an error object from an error code and include the OAuth error code in the user message
     */
    private _createOAuthApiError(errorCode: string, userMessage: string, oauthErrorCode: string | null): ApiError {

        // Include the OAuth error code in the short technical message returned
        let message = userMessage;
        if (errorCode) {
            message += ` : ${errorCode}`;
        }

        return new ApiError(this._configuration.apiName, errorCode, message);
    }

    /*
     * Concatenate parts of an error
     */
    private _getErrorDetails(oauthDetails: string | null, responseError: any, url: string): string {

        let detailsText = '';
        if (oauthDetails) {
            detailsText += oauthDetails;
        } else {
            detailsText += ExceptionHelper.getExceptionDetails(responseError);
        }

        if (url) {
            detailsText += `, URL: ${url}`;
        }

        return detailsText;
    }
}
