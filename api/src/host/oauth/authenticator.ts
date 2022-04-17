import axios, {AxiosRequestConfig} from 'axios';
import {jwtVerify} from 'jose';
import {URLSearchParams} from 'url';
import {TokenClaims} from '../../logic/entities/claims/tokenClaims';
import {UserInfoClaims} from '../../logic/entities/claims/userInfoClaims';
import {ClientError} from '../../logic/errors/clientError';
import {OAuthConfiguration} from '../configuration/oauthConfiguration';
import {ErrorFactory} from '../errors/errorFactory';
import {HttpProxy} from '../utilities/httpProxy';
import {JwksRetriever} from './jwksRetriever';

/*
 * The entry point for OAuth related operations
 */
export class Authenticator {

    private readonly _configuration: OAuthConfiguration;
    private readonly _jwksRetriever: JwksRetriever;
    private readonly _httpProxy: HttpProxy;

    public constructor(configuration: OAuthConfiguration, jwksRetriever: JwksRetriever, httpProxy: HttpProxy) {
        this._configuration = configuration;
        this._jwksRetriever = jwksRetriever;
        this._httpProxy = httpProxy;
    }

    /*
     * Do standard JWT access token validation using the JOSE library
     */
    public async validateToken(accessToken: string): Promise<TokenClaims> {

        try {

            // Perform the JWT validation according to best practices
            const options = {
                algorithms: ['RS256'],
                issuer: this._configuration.issuer,
                audience: this._configuration.audience,
            };
            const result = await jwtVerify(accessToken, this._jwksRetriever.remoteJWKSet, options);

            // Read protocol claims and Azure AD uses some vendor specific values
            const userId = this._getClaim(result.payload['oid'] as string, 'oid');
            const scope = this._getClaim(result.payload['scp'] as string, 'scp');
            const expiry = result.payload.exp!;

            // Return the claims object
            return new TokenClaims(userId, scope.split(' '), expiry);

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
    }

    /*
     * Return Graph user info claims
     */
    public async getUserInfo(accessToken: string): Promise<UserInfoClaims> {

        // We need to get a separate Graph API token to get user info
        const userInfoAccessToken = await this._getGraphAccessToken(accessToken);

        // Next look up user info and get claims
        return this._getUserInfoClaims(userInfoAccessToken);
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
            return response.data.access_token!;

        } catch (e) {

            // Report Graph errors clearly
            throw ErrorFactory.fromUserInfoTokenGrantError(e, this._configuration.tokenEndpoint);
        }
    }

    /*
     * Perform OAuth user info lookup when required
     */
    private async _getUserInfoClaims(accessToken: string): Promise<UserInfoClaims> {

        try {

            const options = {
                url: this._configuration.userInfoEndpoint,
                method: 'POST',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'accept': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                httpsAgent: this._httpProxy.agent,
            };

            const response = await axios.request(options as AxiosRequestConfig);
            const userInfo = response.data as any;

            // In my simple setup focused on developer convenience, the email is in the name setting
            const givenName = this._getClaim(userInfo.given_name, 'given_name');
            const familyName = this._getClaim(userInfo.family_name, 'family_name');
            const email = this._getClaim(userInfo.name, 'name');
            return new UserInfoClaims(givenName, familyName, email);

        } catch (e) {

            // Report user info errors clearly
            throw ErrorFactory.fromUserInfoError(e, this._configuration.userInfoEndpoint);
        }
    }

    /*
     * Sanity checks when receiving claims to avoid failing later with a cryptic error
     */
    private _getClaim(claim: string | undefined, name: string): string {

        if (!claim) {
            throw ErrorFactory.fromMissingClaim(name);
        }

        return claim;
    }
}
