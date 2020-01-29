import {Request} from 'express';
import {ApiClaims} from '../../logic/entities/apiClaims';
import {CustomClaimsProvider} from '../oauth/customClaimsProvider';

/*
 * An example of including domain specific authorization rules during claims lookup
 */
export class SampleCustomClaimsProvider implements CustomClaimsProvider {

    /*
     * Our sample will allow the user to access data associated to the below regions but not for Asia
     */
    public async addCustomClaims(accessToken: string, request: Request, claims: ApiClaims): Promise<void> {

        // We will hard code the coverage, whereas a real scenario would look up the user data
        // This might exist in a product database table such as UserRegions, mapped to the OAuth user id
        claims.regionsCovered = ['Europe', 'USA'];
    }
}
