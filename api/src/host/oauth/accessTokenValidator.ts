import {JWTPayload, JWTVerifyOptions, jwtVerify} from 'jose';
import {ClientError} from '../../logic/errors/clientError.js';
import {ErrorCodes} from '../../logic/errors/errorCodes.js';
import {ClaimsReader} from '../claims/claimsReader.js';
import {OAuthConfiguration} from '../configuration/oauthConfiguration.js';
import {ErrorFactory} from '../errors/errorFactory.js';
import {JwksRetriever} from './jwksRetriever.js';

/*
 * The entry point for OAuth related operations
 */
export class AccessTokenValidator {

    private readonly _configuration: OAuthConfiguration;
    private readonly _jwksRetriever: JwksRetriever;

    public constructor(configuration: OAuthConfiguration, jwksRetriever: JwksRetriever) {
        this._configuration = configuration;
        this._jwksRetriever = jwksRetriever;
    }

    /*
     * Do standard JWT access token validation using the JOSE library
     */
    public async validateAccessToken(accessToken: string): Promise<JWTPayload> {

        const options = {
            algorithms: ['RS256'],
            issuer: this._configuration.issuer,
            audience: this._configuration.audience,
        } as JWTVerifyOptions;

        // Validate the token and get its claims
        let claims: JWTPayload;
        try {

            const result = await jwtVerify(accessToken, this._jwksRetriever.remoteJWKSet, options);
            claims = result.payload;
        } catch (e: any) {

            // Generic errors are returned when the JWKS download fails
            if (e.code === 'ERR_JOSE_GENERIC') {
                throw ErrorFactory.fromJwksDownloadError(e, this._configuration.jwksEndpoint);
            }

            // Otherwise return a 401 error, such as when a JWT with an invalid 'kid' value is supplied
            let details = 'JWT verification failed';
            if (e.message) {
                details += ` : ${e.message}`;
            }

            throw ClientError.create401(details);
        }

        // The sample API requires the same scope for all endpoints, and it is enforced here
        const scopes = ClaimsReader.getStringClaim(claims, 'scp');
        if (scopes.indexOf(this._configuration.scope) === -1) {

            throw new ClientError(
                403,
                ErrorCodes.insufficientScope,
                'The token does not contain sufficient scope for this API');
        }

        return claims;
    }
}
