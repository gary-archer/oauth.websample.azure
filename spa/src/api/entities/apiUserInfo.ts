/*
 * User attributes from both the OAuth user info and the API's own data
 */
export interface ApiUserInfo {
    givenName: string;
    familyName: string;
    title: string;
    regions: string[];
}
