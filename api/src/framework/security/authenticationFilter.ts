import {NextFunction, Request, Response} from 'express';
import {injectable} from 'inversify';
import {FRAMEWORKTYPES} from '../configuration/frameworkTypes';
import {ICustomClaimsProvider} from '../extensibility/icustomClaimsProvider';
import {LogEntry} from '../logging/logEntry';
import {HttpContextAccessor} from '../utilities/httpContextAccessor';
import {ResponseWriter} from '../utilities/responseWriter';
import {ClaimsMiddleware} from './claimsMiddleware';
import {CoreApiClaims} from './coreApiClaims';
import {CustomPrincipal} from './customPrincipal';

/*
 * The Express entry point for authentication processing
 */
@injectable()
export class AuthenticationFilter<TClaims extends CoreApiClaims> {

    // Injected dependencies
    private readonly _unsecuredPaths: string[];
    private readonly _contextAccessor: HttpContextAccessor;
    private readonly _claimsSupplier: () => TClaims;
    private readonly _customClaimsProviderSupplier: () => ICustomClaimsProvider<TClaims>;

    /*
     * Receive dependencies
     */
    public constructor(
        unsecuredPaths: string[],
        contextAccessor: HttpContextAccessor,
        claimsSupplier: () => TClaims,
        customClaimsProviderSupplier: () => ICustomClaimsProvider<TClaims>) {

        this._unsecuredPaths = unsecuredPaths;
        this._contextAccessor = contextAccessor;
        this._claimsSupplier = claimsSupplier;
        this._customClaimsProviderSupplier = customClaimsProviderSupplier;
        this._setupCallbacks();
    }

    /*
     * The entry point for implementing authorization
     */
    public async authorizeAndGetClaims(request: Request, response: Response, next: NextFunction): Promise<void> {

        if (this._isUnsecuredPath(request.originalUrl.toLowerCase())) {

            // Move to controller logic if this is an unsecured API operation
            next();

        } else {

            // Otherwise do OAuth processing
            const claims = await this._authorizeApiRequest(request, response);
            if (claims) {

                // On success, move on to the controller logic
                next();

            } else {

                // Otherwise return a 401 response
                const writer = new ResponseWriter();
                writer.writeInvalidTokenResponse(response);
            }
        }
    }

    /*
     * Do the authorization work and return claims on success
     */
    private async _authorizeApiRequest(request: Request, response: Response): Promise<TClaims | null> {

        // Try to get the access token and create empty claims
        const accessToken = this._readAccessToken(request);

        // Create the claims middleware for this request and set callbacks
        const httpContext = this._contextAccessor.getHttpContext(request);
        const middleware = httpContext.container.get<ClaimsMiddleware<TClaims>>(FRAMEWORKTYPES.ClaimsMiddleware)
                                      .withClaimsSupplier(this._claimsSupplier)
                                      .withCustomClaimsProviderSupplier(this._customClaimsProviderSupplier);

        // Call the middleware to process the access token and return claims
        const claims = await middleware.authorizeRequestAndGetClaims(accessToken);
        if (!claims) {

            // Non success responses mean a missing, expired or invalid token, and we will return 401
            return null;
        } else {

            // Set the user against the HTTP context, as expected by inversify express
            httpContext.user = new CustomPrincipal(claims);

            // Log who called the API
            const logEntry = httpContext.container.get<LogEntry>(FRAMEWORKTYPES.LogEntry);
            logEntry.setIdentity(claims);

            // Register the claims against this requests's child container so that they can be injected into controllers
            httpContext.container.bind<TClaims>(FRAMEWORKTYPES.ApiClaims).toConstantValue(claims);

            // On success, set claims against the request context and move on to the controller logic
            return claims;
        }
    }

    /*
     * Try to read the token from the authorization header
     */
    private _readAccessToken(request: Request): string | null {

        const authorizationHeader = request.header('authorization');
        if (authorizationHeader) {
            const parts = authorizationHeader.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                return parts[1];
            }
        }

        return null;
    }

    /*
     * Return true if this request does not use security
     */
    private _isUnsecuredPath(path: string): boolean {
        const found = this._unsecuredPaths.find((p) => path.startsWith(p));
        return !!found;
    }

    /*
     * Plumbing to ensure the this parameter is available
     */
    private _setupCallbacks(): void {
        this.authorizeAndGetClaims = this.authorizeAndGetClaims.bind(this);
    }
}
