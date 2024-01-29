/*
 * Claims containg user details
 */
export class UserInfoClaims {

    private _givenName: string;
    private _familyName: string;

    public constructor(givenName: string, familyName: string) {
        this._givenName = givenName;
        this._familyName = familyName;
    }

    public get givenName(): string {
        return this._givenName;
    }

    public get familyName(): string {
        return this._familyName;
    }
}
