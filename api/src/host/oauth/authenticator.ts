import jsonwebtoken from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import {Client, Issuer} from 'openid-client';
import {ApiClaims} from '../../logic/entities/apiClaims';
import {ClientError} from '../../logic/errors/clientError';
import {OAuthConfiguration} from '../configuration/oauthConfiguration';
import {ErrorHandler} from '../errors/errorHandler';
import {ApiLogger} from '../utilities/apiLogger';

/*
 * The entry point for OAuth related operations
 */
export class Authenticator {

    private readonly _oauthConfig: OAuthConfiguration;
    private readonly _issuer: Issuer<Client>;

    public constructor(oauthConfig: OAuthConfiguration, issuer: Issuer<Client>) {
        this._oauthConfig = oauthConfig;
        this._issuer = issuer;
        this._setupCallbacks();
    }

    /*
     * Our implementation uses in memory token validation to get token claims
     */
    public async authenticateAndSetClaims(accessToken: string, claims: ApiClaims): Promise<number> {
        return await this._validateTokenInMemoryAndSetTokenClaims(accessToken, claims);
    }

    /*
     * In memory token processing
     */
    private async _validateTokenInMemoryAndSetTokenClaims(accessToken: string, claims: ApiClaims): Promise<number> {

        // First decoode the token without verifying it so that we get the key identifier
        const decoded = jsonwebtoken.decode(accessToken, {complete: true});
        if (!decoded) {
            throw ClientError.create401('Unable to decode received JWT');
        }

        // Get the key identifier from the JWT header
        const keyIdentifier = (decoded as any).header.kid;
        ApiLogger.info(`Token key identifier is ${keyIdentifier}`);

        // Download the token signing public key for the key identifier
        const tokenSigningPublicKey = await this._downloadJwksKeyForKeyIdentifier(keyIdentifier);
        ApiLogger.info(`Token signing public key for ${keyIdentifier} was found`);

        // Use a library to verify the token's signature, issuer, audience and that it is not expired
        const tokenData = this._validateTokenInMemory(accessToken, tokenSigningPublicKey);
        ApiLogger.info(`Token passed in memory validation`);

        // Read protocol claims and we will use the immutable user id as the subject claim
        const userId = this._getClaim(tokenData.oid, 'oid');
        const clientId = ''; // this._getClaim(tokenData.appid, 'appid');
        const scope = this._getClaim(tokenData.scp, 'scp');
        const expiry = this._getClaim(tokenData.exp, 'exp');

        // Set token claims
        claims.setTokenInfo(userId, clientId, scope.split(' '));

        // Azure includes user info in the access token
        const givenName = ''; // this._getClaim(tokenData.given_name, 'given_name');
        const familyName = ''; // this._getClaim(tokenData.family_name, 'family_name');
        const email = ''; // this._getClaim(tokenData.email, 'email');
        claims.setCentralUserInfo(givenName, familyName, email);

        // Return the expiry for claims caching
        return expiry;
    }

    /*
     * Download the public key with which our access token is signed
     */
    private async _downloadJwksKeyForKeyIdentifier(tokenKeyIdentifier: string): Promise<string> {

        try {
            // Trigger a download of JWKS keys
            const keyStore = await this._issuer!.keystore(true);

            // Extend token data with central user info
            const keys = keyStore.all();
            const key = keys.find((k) => k.kid === tokenKeyIdentifier);
            if (key) {

                // Convert to PEM format
                return jwkToPem(key);
            }

        } catch (e) {

            // Report errors clearly
            throw ErrorHandler.fromSigningKeysDownloadError(e, this._issuer.metadata.jwks_uri!);
        }

        // Indicate not found
        throw ClientError.create401(`Key with identifier: ${tokenKeyIdentifier} not found in JWKS download`);
    }

    /*
     * Call a third party library to do the token validation, and return token claims
     */
    private _validateTokenInMemory(accessToken: string, tokenSigningPublicKey: string): any {

        try {

            // Verify the token's signature, issuer, audience and that it is not expired
            const options = {
                audience: this._oauthConfig.audience,
                issuer: this._issuer.metadata.issuer!,
            };

            return jsonwebtoken.verify(accessToken, tokenSigningPublicKey, options);

        } catch (e) {

            // Handle failures and capture the details
            let details = 'JWT verification failed';
            if (e.message) {
                details += ` : ${e.message}`;
            }
            if (e.stack) {
                details += ` : ${e.stack}`;
            }

            throw ClientError.create401(details);
        }
    }

    /*
     * Sanity checks when receiving claims to avoid failing later with a cryptic error
     */
    private _getClaim(claim: string, name: string): any {

        if (!claim) {
            throw ErrorHandler.fromMissingClaim(name);
        }

        return claim;
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks(): void {
        this.authenticateAndSetClaims = this.authenticateAndSetClaims.bind(this);
    }
}
