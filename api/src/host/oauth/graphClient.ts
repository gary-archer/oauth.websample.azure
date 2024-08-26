import axios, {AxiosRequestConfig} from 'axios';
import {URLSearchParams} from 'url';
import {OAuthConfiguration} from '../configuration/oauthConfiguration.js';
import {ErrorFactory} from '../errors/errorFactory.js';
import {HttpProxy} from '../utilities/httpProxy.js';

/*
 * The entry point for OAuth related operations
 */
export class GraphClient {

    private readonly _configuration: OAuthConfiguration;
    private readonly _httpProxy: HttpProxy;

    public constructor(configuration: OAuthConfiguration, httpProxy: HttpProxy) {
        this._configuration = configuration;
        this._httpProxy = httpProxy;
    }

    /*
     * Return Graph user info claims
     */
    public async getUserInfo(accessToken: string): Promise<any> {

        // We need to get a new Graph API token in order to get user info
        const userInfoAccessToken = await this._getGraphAccessToken(accessToken);

        // Next look up user info with the Graph access token
        return this._getUserInfo(userInfoAccessToken);
    }

    /*
     * Use a user assertion to get a different token for the same user, with permissions to call the user info endpoint
     */
    private async _getGraphAccessToken(accessToken: string): Promise<string> {

        try {

            const formData = new URLSearchParams();
            formData.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
            formData.append('client_id', this._configuration.graphClient.clientId);
            formData.append('client_secret', this._configuration.graphClient.clientSecret);
            formData.append('assertion', accessToken);
            formData.append('scope', this._configuration.graphClient.scope);
            formData.append('requested_token_use', 'on_behalf_of');

            const options = {
                url: this._configuration.tokenEndpoint,
                method: 'POST',
                data: formData,
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'accept': 'application/json',
                },
                httpsAgent: this._httpProxy.agent,
            };

            const response = await axios.request(options as AxiosRequestConfig) as any;
            return response.data.access_token || '';

        } catch (e: any) {

            // Report Graph errors clearly
            throw ErrorFactory.fromUserInfoTokenGrantError(e, this._configuration.tokenEndpoint);
        }
    }

    /*
     * Perform OAuth user info lookup when required
     */
    private async _getUserInfo(accessToken: string): Promise<any> {

        try {

            const options = {
                url: this._configuration.userInfoEndpoint,
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                httpsAgent: this._httpProxy.agent,
            };

            const response = await axios.request(options as AxiosRequestConfig);
            return response.data as any;

        } catch (e: any) {

            // Report user info errors clearly
            throw ErrorFactory.fromUserInfoError(e, this._configuration.userInfoEndpoint);
        }
    }
}
