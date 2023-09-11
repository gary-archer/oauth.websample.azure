import {ClaimsPrincipal} from '../entities/claims/claimsPrincipal.js';

/*
 * The SPA usually gets OAuth user info from the authorization server
 * It then gets extra user attributes from the business data by calling the API
 * Due to the need to use the on behalf of flow, values from both sources are returned here
 */
export class UserInfoService {

    private readonly _claims: ClaimsPrincipal;

    public constructor(claims: ClaimsPrincipal) {
        this._claims = claims;
    }

    public getUserInfo(): any {

        return {
            givenName: this._claims.userInfo.givenName,
            familyName: this._claims.userInfo.familyName,
            title: this._claims.extra.title,
            regions: this._claims.extra.regions,
        };
    }
}
