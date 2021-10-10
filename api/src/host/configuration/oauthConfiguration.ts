import {OAuthClientConfiguration} from './oauthClientConfiguration';

/*
 * A holder for OAuth settings
 */
export interface OAuthConfiguration {
    jwksEndpoint: string;
    userInfoEndpoint: string;
    algorithm: string;
    issuer: string;
    audience: string;
    claimsCacheTimeToLiveMinutes: number;
    client: OAuthClientConfiguration;
}
