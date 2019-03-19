import {CoreApiClaims} from '../security/coreApiClaims';

/*
 * An interface for providing custom claims that the business logic can implement
 */
export interface ICustomClaimsProvider<TClaims extends CoreApiClaims> {

    addCustomClaims(accessToken: string, claims: TClaims): Promise<void>;
}
