import {ClaimsPrincipal} from '../entities/claims/claimsPrincipal.js';

/*
 * The API provides two user info endpoints for the SPA
 */
export class UserInfoService {

    private readonly _claims: ClaimsPrincipal;

    public constructor(claims: ClaimsPrincipal) {
        this._claims = claims;
    }

    /*
     * Special handling to get information from the Entra ID OAuth user info endpoint
     */
    public getOAuthUserInfo(): any {

        return {
            'given_name': 'John',
            'family_name': 'Doe',
        };
    }

    /*
     * Get user attributes not stored in the authorization server
     */
    public async getApiUserInfo(): Promise<any> {

        return {
            title: this._claims.extra.title,
            regions: this._claims.extra.regions,
        };
    }
}
