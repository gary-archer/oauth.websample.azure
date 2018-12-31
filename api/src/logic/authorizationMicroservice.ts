import {ApiClaims} from '../entities/apiClaims';

/*
 * A repository class for returning domain specific authorization rules
 */
export class AuthorizationMicroservice {

    /*
     * Class setup
     */
    public constructor() {
        this._setupCallbacks();
    }

    /*
     * Return custom domain specific claims given the token claims and central user claims
     * If required the access token could be used to call an authorization microservice
     */
    public async getProductClaims(claims: ApiClaims, accessToken: string): Promise<void> {
        claims.setProductSpecificUserRights(this._getCompaniesCoveredByUser(claims.userId));
    }

    /*
     * For the purposes of our code sample we will grant access to the first 3 companies
     * However, the API will deny access to company 4, which the user does not have rights to
     */
    private _getCompaniesCoveredByUser(userId: string) {
        return [1, 2, 3];
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks() {
        this.getProductClaims = this.getProductClaims.bind(this);
    }
}
