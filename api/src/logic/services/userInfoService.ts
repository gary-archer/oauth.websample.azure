import {UserInfoClaims} from '../entities/claims/userInfoClaims';

/*
 * Our user info service runs after claims handling has completed
 */
export class UserInfoService {

    private readonly _claims: UserInfoClaims;

    public constructor(claims: UserInfoClaims) {
        this._claims = claims;
    }

    public getUserInfo(): any {

        return {
            givenName: this._claims.givenName,
            familyName: this._claims.familyName,
        };
    }
}
