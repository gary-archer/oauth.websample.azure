import {injectable} from 'inversify';
import {CoreApiClaims} from '../../framework';

/*
 * Override the core claims to support additional custom claims
 */
@injectable()
export class BasicApiClaims extends CoreApiClaims {

    private _accountsCovered!: number[];

    public get accountsCovered(): number[] {
        return this._accountsCovered;
    }

    public set accountsCovered(accountsCovered: number[]) {
        this._accountsCovered = accountsCovered;
    }
}
