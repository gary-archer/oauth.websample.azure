import * as OpenIdClient from 'openid-client';
import {FrameworkConfiguration} from '../configuration/frameworkConfiguration';
import {OAuthErrorHandler} from '../errors/oauthErrorHandler';
import {DebugProxyAgent} from '../utilities/debugProxyAgent';

/*
 * A singleton to read metadata at application startup
 */
export class IssuerMetadata {

    /*
     * Instance fields
     */
    private readonly _configuration: FrameworkConfiguration;
    private _issuer: any;

    /*
     * Receive configuration
     */
    public constructor(configuration: FrameworkConfiguration) {
        this._configuration = configuration;

        // Set up OAuth HTTP requests and extend the default 1.5 second timeout
        OpenIdClient.Issuer.defaultHttpOptions = {
            timeout: 10000,
            agent: DebugProxyAgent.get(),
        };
    }

    /*
     * Load the metadata at startup and wait for completion
     */
    public async load(): Promise<void> {

        try {
            const endpoint = `${this._configuration.authority}/.well-known/openid-configuration`;
            this._issuer = await OpenIdClient.Issuer.discover(endpoint);
        } catch (e) {
            const handler = new OAuthErrorHandler(this._configuration);
            throw handler.fromMetadataError(e, this._configuration.authority);
        }
    }

    /*
     * Return the metadata for use during API requests
     */
    public get issuer(): string {
        return this._issuer;
    }
}
