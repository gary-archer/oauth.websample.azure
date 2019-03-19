import {ICustomClaimsProvider} from '../../framework';
import {BasicApiClaims} from '../entities/basicApiClaims';

/*
 * An example of including domain specific authorization rules during claims lookup
 */
export class BasicApiClaimsProvider implements ICustomClaimsProvider<BasicApiClaims> {

    /*
     * The interface supports returning results based on the user id from the token
     * This might involve a database lookup or a call to another service
     */
    public async addCustomClaims(accessToken: string, claims: BasicApiClaims): Promise<void> {

        // Any attempts to access data for company 3 will result in an unauthorized error
        claims.accountsCovered = [1, 2, 4];
    }
}
