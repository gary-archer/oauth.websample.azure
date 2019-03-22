import * as got from 'got';
import {inject, injectable} from 'inversify';
import * as jwt from 'jsonwebtoken';
import * as jwks from 'jwks-rsa';
import {Logger} from 'winston';
import {FrameworkConfiguration} from '../configuration/frameworkConfiguration';
import {FRAMEWORKTYPES} from '../configuration/frameworkTypes';
import {ClientError} from '../errors/clientError';
import {OAuthErrorHandler} from '../errors/oauthErrorHandler';
import {ILoggerFactory} from '../extensibility/iloggerFactory';
import {LogEntry} from '../logging/logEntry';
import {DebugProxyAgent} from '../utilities/debugProxyAgent';
import {using} from '../utilities/using';
import {CoreApiClaims} from './coreApiClaims';
import {IssuerMetadata} from './issuerMetadata';

/*
 * The entry point for OAuth related operations
 */
@injectable()
export class Authenticator {

    /*
     * Injected dependencies
     */
    private readonly _configuration: FrameworkConfiguration;
    private readonly _issuer: any;
    private readonly _logEntry: LogEntry;
    private readonly _debugLogger: Logger;

    /*
     * Receive dependencies
     */
    public constructor(
        @inject(FRAMEWORKTYPES.Configuration) configuration: FrameworkConfiguration,
        @inject(FRAMEWORKTYPES.IssuerMetadata) metadata: IssuerMetadata,
        @inject(FRAMEWORKTYPES.LoggerFactory) loggerFactory: ILoggerFactory,
        @inject(FRAMEWORKTYPES.LogEntry) logEntry: LogEntry) {

        this._configuration = configuration;
        this._issuer = metadata.issuer;
        this._logEntry = logEntry;
        this._debugLogger = loggerFactory.createDevelopmentLogger(Authenticator.name);
        this._setupCallbacks();
    }

    /*
     * The first public operation downloads token signing keys in a raw format for the UI
     * This works around CORS limitations in Azure that prevent the browser making the call
     */
    public async getTokenSigningKeys(): Promise<any> {

        try {
            const response = await got(this._issuer.jwks_uri, {
                json: true,
                agent: DebugProxyAgent.get(),
            });
            return response.body;

        } catch (e) {
            const handler = new OAuthErrorHandler(this._configuration);
            throw handler.fromSigningKeysDownloadError(e, this._issuer.jwks_uri);
        }
    }

    /*
     * Make a call to the introspection endpoint to read our token
     */
    public async authenticateAndSetClaims(accessToken: string, claims: CoreApiClaims): Promise<number> {

        const performance = this._logEntry.createPerformanceBreakdown('validateToken');
        return using(performance, async () => {

            // First decoode the token without verifying it so that we get the key identifier
            const decoded = jwt.decode(accessToken, {complete: true});
            if (!decoded) {
                throw ClientError.create401('Unable to decode received JWT');
            }

            // Get the key identifier from the JWT header
            const keyIdentifier = decoded.header.kid;
            this._debugLogger.debug(`Token key identifier is ${keyIdentifier}`);

            // Download the token signing public key for the key identifier
            const tokenSigningPublicKey = await this._downloadJwksKeyForKeyIdentifier(keyIdentifier);
            if (!tokenSigningPublicKey) {
                throw ClientError.create401(`Failed to find JWKS key with identifier: ${keyIdentifier}`);
            }

            // Use a library to verify the token's signature, issuer, audience and that it is not expired
            this._debugLogger.debug(`Token signing public key for ${keyIdentifier} downloaded successfully`);
            const [isValid, tokenData] = this._validateTokenInMemory(accessToken, tokenSigningPublicKey);

            // Indicate an invalid token if it failed verification
            if (!isValid) {
                throw ClientError.create401(`JWT verification failed: ${tokenData}`);
            }

            // Read protocol claims and we will use the immutable user id as the subject claim
            const userId = this._getClaim(tokenData.oid, 'oid');
            const clientId = this._getClaim(tokenData.appid, 'appid');
            const scope = this._getClaim(tokenData.scp, 'scp');
            const expiry = this._getClaim(tokenData.exp, 'exp');

            // Set token claims
            claims.setTokenInfo(userId, clientId, scope.split(' '));

            // Azure includes user info in the access token
            const givenName = this._getClaim(tokenData.given_name, 'given_name');
            const familyName = this._getClaim(tokenData.family_name, 'family_name');
            const email = this._getClaim(tokenData.email, 'email');
            claims.setCentralUserInfo(givenName, familyName, email);

            // Return the expiry for claims caching
            return expiry;
        });
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
                jwksUri: this._issuer.jwks_uri,
            });

            // Make a call to get the signing key
            client.getSigningKeys((err: any, keys: jwks.Jwk[]) => {

                // Handle errors
                if (err) {
                    const handler = new OAuthErrorHandler(this._configuration);
                    return reject(handler.fromSigningKeysDownloadError(err, this._issuer.jwks_uri));
                }

                // Find the key in the download
                const key = keys.find((k) => k.kid === tokenKeyIdentifier);
                if (key) {
                    return resolve(key.publicKey || key.rsaPublicKey);
                }

                // Indicate not found
                return resolve(null);
            });
        });
    }

    /*
     * Call a third party library to do the token validation, and return token claims
     */
    private _validateTokenInMemory(accessToken: string, tokenSigningPublicKey: string): [boolean, any] {

        try {

            // Verify the token's signature, issuer, audience and that it is not expired
            const options = {
                audience: this._configuration.audience,
                issuer: this._issuer.issuer,
            };

            const claims = jwt.verify(accessToken, tokenSigningPublicKey, options);
            return [true, claims];

        } catch (e) {

            // Indicate failure
            return [false, e];
        }
    }

    /*
     * Sanity checks when receiving claims to avoid failing later with a cryptic error
     */
    private _getClaim(claim: string, name: string): any {

        if (!claim) {
            const handler = new OAuthErrorHandler(this._configuration);
            throw handler.fromMissingClaim(name);
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
