import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {FRAMEWORKTYPES} from '../configuration/frameworkTypes';
import {ICustomClaimsProvider} from '../extensibility/icustomClaimsProvider';
import {ILoggerFactory} from '../extensibility/iloggerFactory';
import {Authenticator} from './authenticator';
import {ClaimsCache} from './claimsCache';
import {CoreApiClaims} from './coreApiClaims';

/*
 * The entry point for the processing to validate tokens and return claims
 * Our approach provides extensible claims to our API and enables high performance
 * It also takes close control of error responses to our SPA
 */
@injectable()
export class ClaimsMiddleware<TClaims extends CoreApiClaims> {

    // Injected dependencies
    private readonly _cache: ClaimsCache<TClaims>;
    private readonly _authenticator: Authenticator;
    private readonly _debugLogger: Logger;

    // Callbacks
    private _claimsSupplier!: () => TClaims;
    private _customClaimsProviderSupplier!: () => ICustomClaimsProvider<TClaims>;

    /*
     * Receive dependencies
     */
    public constructor(
        @inject(FRAMEWORKTYPES.ClaimsCache) cache: ClaimsCache<TClaims>,
        @inject(FRAMEWORKTYPES.Authenticator) authenticator: Authenticator,
        @inject(FRAMEWORKTYPES.LoggerFactory) loggerFactory: ILoggerFactory) {

        this._cache = cache;
        this._authenticator = authenticator;
        this._debugLogger = loggerFactory.createDevelopmentLogger(ClaimsMiddleware.name);
    }

    public withClaimsSupplier(claimsSupplier: () => TClaims): ClaimsMiddleware<TClaims> {
        this._claimsSupplier = claimsSupplier;
        return this;
    }

    public withCustomClaimsProviderSupplier(customClaimsProviderSupplier: () => ICustomClaimsProvider<TClaims>)
        : ClaimsMiddleware<TClaims> {

        this._customClaimsProviderSupplier = customClaimsProviderSupplier;
        return this;
    }

    /*
     * Authorize a request and return claims on success
     * A null response indicates invalid or expired tokens which will result in a 401
     * An error response is also possiblem, which will result in a 500
     */
    public async authorizeRequestAndGetClaims(accessToken: string | null): Promise<TClaims | null> {

        // First handle missing tokens
        if (!accessToken) {
            this._debugLogger.debug('No access token was supplied in the bearer header');
            return null;
        }

        // Bypass and use cached results if they exist
        const cachedClaims = await this._cache.getClaimsForToken(accessToken);
        if (cachedClaims) {
            this._debugLogger.debug('Existing claims returned from cache');
            return cachedClaims;
        }

        // Otherwise create new claims which we will populate
        const claims = this._claimsSupplier();

        // Introspect the token and set claims
        const [tokenSuccess, expiry] = await this._authenticator.validateTokenAndSetClaims(accessToken, claims);
        if (!tokenSuccess) {
            this._debugLogger.debug('Invalid or expired access token received');
            return null;
        }

        // Add any custom product specific custom claims
        await this._customClaimsProviderSupplier().addCustomClaims(accessToken, claims);

        // Cache the claims against the token hash until the token's expiry time
        // The next time the API is called, all of the above results can be quickly looked up
        await this._cache.addClaimsForToken(accessToken, expiry, claims);
        this._debugLogger.debug('Claims lookup for new token completed successfully');
        return claims;
    }
}
