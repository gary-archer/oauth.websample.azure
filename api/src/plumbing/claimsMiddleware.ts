import {NextFunction, Request, Response} from 'express';
import {AuthorizationMicroservice} from '../logic/authorizationMicroservice';
import {ApiLogger} from '../plumbing/apiLogger';
import {ResponseWriter} from '../plumbing/responseWriter';
import {Authenticator} from './authenticator';
import {ClaimsCache} from './claimsCache';

/*
 * An entry point class for claims processing
 */
export class ClaimsMiddleware {

    /*
     * Fields
     */
    private _authenticator: Authenticator;
    private _authorizationMicroservice: AuthorizationMicroservice;

    /*
     * Receive configuration
     */
    public constructor(authenticator: Authenticator, authorizationMicroservice: AuthorizationMicroservice) {
        this._authenticator = authenticator;
        this._authorizationMicroservice = authorizationMicroservice;
    }

    /*
     * The entry point method to authorize a request
     */
    public async authorizeRequestAndSetClaims(
        request: Request,
        response: Response,
        next: NextFunction): Promise<boolean> {

        // First read the token from the request header and report missing tokens
        const accessToken = this._readToken(request.header('authorization'));
        if (accessToken === null) {
            ApiLogger.info('Claims Middleware', 'No access token received');
            ResponseWriter.writeInvalidTokenResponse(response);
            return false;
        }

        // Bypass validation and use cached results if they exist
        const cachedClaims = ClaimsCache.getClaimsForToken(accessToken);
        if (cachedClaims !== null) {
            response.locals.claims = cachedClaims;
            return true;
        }

        // Otherwise start by introspecting the token
        const result = await this._authenticator.validateTokenAndGetTokenClaims(accessToken);

        // Handle invalid or expired tokens
        if (!result.isValid) {
            ApiLogger.info('Claims Middleware', 'Invalid or expired access token received');
            ResponseWriter.writeInvalidTokenResponse(response);
            return false;
        }

        // We are getting central user info from the token itself
        // Next we look up  product user data and add it to claims
        await this._authorizationMicroservice.getProductClaims(result.claims!, accessToken);

        // Next cache the results
        ClaimsCache.addClaimsForToken(accessToken, result.expiry!, result.claims!);

        // Then move onto the API controller to execute business logic
        ApiLogger.info('Claims Middleware', 'Claims lookup completed successfully');
        response.locals.claims = result.claims;
        return true;
    }

    /*
     * Try to read the token from the authorization header
     */
    private _readToken(authorizationHeader: string | undefined): string | null {

        if (authorizationHeader) {
            const parts = authorizationHeader.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                return parts[1];
            }
        }

        return null;
    }
}
