import {createHash} from 'crypto';
import {Request} from 'express';
import {ClaimsPrincipal} from '../../logic/entities/claims/claimsPrincipal.js';
import {ClientError} from '../../logic/errors/clientError.js';
import {ClaimsCache} from '../claims/claimsCache.js';
import {ExtraClaimsProvider} from '../claims/extraClaimsProvider.js';
import {OAuthClient} from './oauthClient.js';

/*
 * The entry point for the processing to validate tokens and lookup claims
 * Our approach provides extensible claims to our API and enables good performance
 */
export class Authorizer {

    private readonly _cache: ClaimsCache;
    private readonly _oauthClient: OAuthClient;
    private readonly _extraClaimsProvider: ExtraClaimsProvider;

    public constructor(
        cache: ClaimsCache,
        oauthClient: OAuthClient,
        extraClaimsProvider: ExtraClaimsProvider) {

        this._cache = cache;
        this._oauthClient = oauthClient;
        this._extraClaimsProvider = extraClaimsProvider;
    }

    /*
     * Authorize a request and return claims on success, which can then be injected into business logic
     */
    public async authorizeRequestAndGetClaims(request: Request): Promise<ClaimsPrincipal> {

        // First read the access token
        const accessToken = this._readAccessToken(request);
        if (!accessToken) {
            throw ClientError.create401('No access token was supplied in the bearer header');
        }

        // On every API request we validate the JWT, in a zero trust manner
        const tokenClaims = await this._oauthClient.validateToken(accessToken);

        // Return cached claims immediately if found
        const accessTokenHash = createHash('sha256').update(accessToken).digest('hex');
        let extraClaims = await this._cache.getClaimsForToken(accessTokenHash);
        if (extraClaims) {
            return new ClaimsPrincipal(tokenClaims, extraClaims);
        }

        // Look up extra claims not in the JWT access token when the token is first received
        extraClaims = await this._extraClaimsProvider.lookupExtraClaims(tokenClaims);

        // Cache the extra claims for subsequent requests with the same access token
        await this._cache.addClaimsForToken(accessTokenHash, extraClaims, tokenClaims.exp!);

        // Return the final claims used by the API's authorization logic
        return new ClaimsPrincipal(tokenClaims, extraClaims);
    }

    /*
     * Try to read the token from the authorization header
     */
    private _readAccessToken(request: Request): string | null {

        const authorizationHeader = request.header('authorization');
        if (authorizationHeader) {
            const parts = authorizationHeader.split(' ');
            if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
                return parts[1];
            }
        }

        return null;
    }
}
