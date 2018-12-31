import * as got from 'got';
import * as jwt from 'jsonwebtoken';
import * as jwks from 'jwks-rsa';
import * as OpenIdClient from 'openid-client';
import {OAuthConfiguration} from '../configuration/oauthConfiguration';
import {ApiClaims} from '../entities/apiClaims';
import {TokenValidationResult} from '../entities/tokenValidationResult';
import {ApiLogger} from './apiLogger';
import {DebugProxyAgent} from './debugProxyAgent';
import {ErrorHandler} from './errorHandler';

/*
 * Configure the HTTP proxy used by Open Id Client if applicable
 */
OpenIdClient.Issuer.defaultHttpOptions = {
    agent: DebugProxyAgent.get(),
};

/*
 * The entry point for OAuth operations
 */
export class Authenticator {

    /*
     * Metadata is read once only
     */
    private static _issuer: any = null;

    /*
     * Fields
     */
    private _oauthConfig: OAuthConfiguration;

    /*
     * Receive configuration and request metadata
     */
    public constructor(oauthConfig: OAuthConfiguration) {

        this._oauthConfig = oauthConfig;
        this._setupCallbacks();
    }

    /*
     * The first public operation downloads token signing keys in a raw format for the UI
     * This works around CORS limitations in Azure
     */
    public async getTokenSigningKeys(): Promise<any> {

        await this._getMetadata();
        return await this._downloadTokenSigningKeys();
    }

    /*
     * When we receive a new token, look up claims for the user, which will then be cached
     */
    public async validateTokenAndGetTokenClaims(accessToken: string): Promise<TokenValidationResult> {

        // First get metadata if required
        await this._getMetadata();

        // First decoode the token without verifying it so that we get the key identifier
        const decoded = jwt.decode(accessToken, {complete: true});
        if (!decoded) {

            // Indicate an invalid token if we cannot decode it
            ApiLogger.error('Authenticator', 'Unable to decode received JWT');
            return {
                isValid: false,
            } as TokenValidationResult;
        }

        // Get the key identifier from the JWT header
        const keyIdentifier = decoded.header.kid;
        ApiLogger.info('Token validation', `Token key identifier is ${keyIdentifier}`);

        // Download the token signing public key for the key identifier
        const tokenSigningPublicKey = await this._downloadJwksKeyForKeyIdentifier(keyIdentifier);
        if (!tokenSigningPublicKey) {
            return {
                isValid: false,
            } as TokenValidationResult;
        }

        // Use a library to verify the token's signature, issuer, audience and that it is not expired
        ApiLogger.info('Token validation', `Token signing public key for ${keyIdentifier} downloaded successfully`);
        const [isValid, result] = this._validateTokenAndReadClaims(accessToken, tokenSigningPublicKey);

        // Indicate an invalid token if it failed verification
        if (!isValid) {
            ApiLogger.warn('Authenticator', `JWT verification failed: ${result}`);
            return {
                isValid: false,
            } as TokenValidationResult;
        }

        // Get claims and use the immutable user id as the subject claim
        // There is no user info endpoint and user info is included in the access token
        const apiClaims = new ApiClaims(result.oid, result.azp, result.scp);
        apiClaims.setCentralUserData(result);

        // Indicate success
        return {
                isValid: true,
                expiry: result.exp,
                claims: apiClaims,
            } as TokenValidationResult;
    }

    /*
     * Make a call to the metadata endpoint for the first API request
     */
    private async _getMetadata(): Promise<void> {

        if (Authenticator._issuer) {
            return;
        }

        try {
            Authenticator._issuer = await OpenIdClient.Issuer.discover(this._oauthConfig.authority);
        } catch (e) {
            throw ErrorHandler.fromMetadataError(e, this._oauthConfig.authority);
        }
    }

    /*
     * Download the token signing keys in a raw form and return it to the UI where OIDC Client will use it
     */
    private async _downloadTokenSigningKeys(): Promise<string> {

        try {
            const response = await got(Authenticator._issuer.jwks_uri, {
                json: true,
                agent: DebugProxyAgent.get(),
            });
            return response.body;

        } catch (e) {
            throw ErrorHandler.fromSigningKeysDownloadError(e, Authenticator._issuer.jwks_uri);
        }
    }

    /*
     * Download the public key with which our access token is signed
     */
    private async _downloadJwksKeyForKeyIdentifier(tokenKeyIdentifier: string): Promise<string | null> {

        return new Promise<string | null>((resolve, reject) => {

            // Create the client to download the signing key from Azure
            const client = jwks({
                strictSsl: DebugProxyAgent.isDebuggingActive() ? false : true,
                cache: false,
                jwksUri: Authenticator._issuer.jwks_uri,
            });

            // Make a call to get the signing key
            ApiLogger.info('Token validation', `Downloading JWKS key from: ${Authenticator._issuer.jwks_uri}`);
            client.getSigningKeys((err: any, keys: jwks.Jwk[]) => {

                // Handle errors
                if (err) {
                    return reject(ErrorHandler.fromSigningKeysDownloadError(err, Authenticator._issuer.jwks_uri));
                }

                // Find the key in the download
                const key = keys.find((k) => k.kid === tokenKeyIdentifier);
                if (key) {
                    return resolve(key.publicKey || key.rsaPublicKey);
                }

                // Indicate not found
                ApiLogger.info('Authenticator', `Failed to find JWKS key with identifier: ${tokenKeyIdentifier}`);
                return resolve(null);
            });
        });
    }

    /*
     * Call a third party library to do the token validation
     */
    private _validateTokenAndReadClaims(accessToken: string, tokenSigningPublicKey: string): [boolean, any] {

        try {

            // Verify the token's signature, issuer, audience and that it is not expired
            const options = {
                audience: this._oauthConfig.audience,
                issuer: Authenticator._issuer.issuer,
            };
            const claims = jwt.verify(accessToken, tokenSigningPublicKey, options);
            return [true, claims];

        } catch (e) {

            // Indicate failure
            return [false, e];
        }
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks(): void {
        this._validateTokenAndReadClaims = this._validateTokenAndReadClaims.bind(this);
    }
}
