/*
 * A holder for OAuth settings
 */
export interface OAuthConfiguration {
    authority: string;
    audience: string;
    maxClaimsCacheMinutes: number;
}
