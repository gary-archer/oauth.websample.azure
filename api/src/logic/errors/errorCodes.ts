/*
 * A list of API error codes
 */
export class ErrorCodes {

    // An API request to an invalid route
    public static readonly requestNotFound = 'request_not_found';

    // An API request did not have a valid access token
    public static readonly unauthorizedRequest = 'unauthorized';

    // A generic server error with no error translation
    public static readonly serverError = 'server_error';

    // A problem reading Open Id Connect metadata
    public static readonly metadataLookupFailure = 'metadata_lookup_failure';

    // A problem downloading token signing keys used for in memory token validation
    public static readonly signingKeyDownloadFailure = 'signing_key_download';

    // A problem due to an invalid scope
    public static readonly insufficientScope = 'insufficient_scope';

    // The attempt to get a graph token from the token endpoint failed
    public static readonly graphTokenExchangeError = 'graph_token_exchange';

    // A problem calling the user info endpoint
    public static readonly userinfoFailure = 'userinfo_failure';

    // A problem reading claims from payloads
    public static readonly claimsFailure = 'claims_failure';

    // A company was requested that does not exist or the user is unauthorized to access
    public static readonly companyNotFound = 'company_not_found';

    // A company was requested that was not a number
    public static readonly invalidCompanyId = 'invalid_company_id';

    // A problem reading file data
    public static readonly fileReadError = 'file_read_error';
}
