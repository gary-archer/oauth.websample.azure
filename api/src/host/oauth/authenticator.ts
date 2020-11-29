import jsonwebtoken from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import {Client, custom, Issuer, UserinfoResponse} from 'openid-client';
import {ApiClaims} from '../../logic/entities/apiClaims';
import {ClientError} from '../../logic/errors/clientError';
import {OAuthConfiguration} from '../configuration/oauthConfiguration';
import {ErrorHandler} from '../errors/errorHandler';
import {ApiLogger} from '../utilities/apiLogger';
import {HttpProxy} from '../utilities/httpProxy';

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
    public async validateTokenAndGetClaims(accessToken: string, claims: ApiClaims): Promise<void> {

        // Our implementation first validates the token to get token claims
        await this._validateTokenInMemoryAndGetTokenClaims(accessToken, claims);

        // We need to get a separate Graph API token to get user info
        const userInfoAccessToken = await this._getUserInfoAccessToken(accessToken);

        // Next look up user info and get claims
        await this._getCentralUserInfoClaims(userInfoAccessToken, claims);
    }

    /*
     * In memory token processing
     */
    private async _validateTokenInMemoryAndGetTokenClaims(accessToken: string, claims: ApiClaims): Promise<void> {

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
        const clientId = this._getClaim(tokenData.azp, 'azp');
        const scopes = this._getClaim(tokenData.scp, 'scp').split(' ');
        const expiry = parseInt(this._getClaim((tokenData as any).exp, 'exp'), 10);

        // Make sure the token is for this API
        if (!scopes.find((s) => s === this._oauthConfig.requiredScope)) {
            throw ClientError.create401('Access token does not have a valid scope for this API');
        }

        // Set token claims
        claims.setTokenInfo(userId, clientId, scopes, expiry);
    }

    /*
     * Download the public key with which our access token is signed
     */
    private async _downloadJwksKeyForKeyIdentifier(tokenKeyIdentifier: string): Promise<string> {

        try {
            // Trigger a download of JWKS keys
            this._issuer![custom.http_options] = HttpProxy.getOptions;
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
                audience: this._oauthConfig.clientId,
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
     * Use the Azure specific 'on behalf of' flow to get a token with permissions to call the user info endpoint
     */
    private async _getUserInfoAccessToken(accessToken: string): Promise<string> {

        // Create the Open Id Client
        const client = new this._issuer.Client({
            client_id: this._oauthConfig.clientId,
            client_secret: this._oauthConfig.clientSecret,
        });
        client[custom.http_options] = HttpProxy.getOptions;

        try {

            // Make a request to the token endpoint to get a graph token used for user info lookup
            const response = await client.grant({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                client_id: this._oauthConfig.clientId,
                client_secret: this._oauthConfig.clientSecret,
                assertion: accessToken,
                scope: this._oauthConfig.graphApiScope,
                requested_token_use: 'on_behalf_of',
            });

            return response.access_token!;

        } catch (e) {

            // Report Graph errors clearly
            throw ErrorHandler.fromUserInfoTokenGrantError(e, this._issuer.metadata.token_endpoint!!);
        }
    }

    /*
     * We will read central user data by calling the Open Id Connect User Info endpoint
     * Microsoft's implementation is Graph API which seems to only support a few fixed fields
     */
    private async _getCentralUserInfoClaims(accessToken: string, claims: ApiClaims): Promise<void> {

        // Create the Open Id Client
        const client = new this._issuer.Client({
            client_id: 'userinfo',
        });
        client[custom.http_options] = HttpProxy.getOptions;

        try {

            // Make a user info request and we cannot get the email in this manner
            const userInfo: UserinfoResponse = await client.userinfo(accessToken);

            // Read user info claims and update the claims object
            const givenName = this._getClaim(userInfo.given_name, 'given_name');
            const familyName = this._getClaim(userInfo.family_name, 'family_name');
            const email = this._getClaim(userInfo.name, 'name');
            claims.setCentralUserInfo(givenName, familyName, email);

        } catch (e) {

            // Report user info errors clearly
            throw ErrorHandler.fromUserInfoError(e, this._issuer.metadata.userinfo_endpoint!!);
        }
    }

    /*
     * Sanity checks when receiving claims to avoid failing later with a cryptic error
     */
    private _getClaim(claim: string | undefined, name: string): string {

        if (!claim) {
            throw ErrorHandler.fromMissingClaim(name);
        }

        return claim;
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks(): void {
        this.validateTokenAndGetClaims = this.validateTokenAndGetClaims.bind(this);
    }
}
