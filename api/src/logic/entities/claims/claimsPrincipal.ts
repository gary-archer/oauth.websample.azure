import {JWTPayload} from 'jose';
import {ExtraClaims} from './extraClaims.js';

/*
 * Our claims principal contains claims from the token and other sources
 */
export class ClaimsPrincipal {

    private _tokenClaims: JWTPayload;
    private _extraClaims: ExtraClaims;

    public constructor(tokenClaims: JWTPayload, extraClaims: ExtraClaims) {
        this._tokenClaims = tokenClaims;
        this._extraClaims = extraClaims;
    }

    public get token(): JWTPayload {
        return this._tokenClaims;
    }

    public get extra(): ExtraClaims {
        return this._extraClaims;
    }
}
