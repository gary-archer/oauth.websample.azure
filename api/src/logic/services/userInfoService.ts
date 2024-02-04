import {OAuthClient} from '../../host/oauth/oauthClient.js';
import {ClaimsPrincipal} from '../entities/claims/claimsPrincipal.js';

/*
 * The API provides two user info endpoints for the SPA
 */
export class UserInfoService {

    private readonly _oauthClient: OAuthClient;
    private readonly _claims: ClaimsPrincipal;

    public constructor(oauthClient: OAuthClient, claims: ClaimsPrincipal) {
        this._oauthClient = oauthClient;
        this._claims = claims;
    }

    /*
     * Special handling to get information from the Entra ID OAuth user info endpoint
     */
    public async getOAuthUserInfo(accessToken: string): Promise<any> {
        return await this._oauthClient.getUserInfo(accessToken);
    }

    /*
     * Return user attributes not stored in the authorization server to the UI for display
     */
    public getApiUserInfo(): any {

        return {
            title: this._claims.extra.title,
            regions: this._claims.extra.regions,
        };
    }
}
