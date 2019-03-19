
import {ICustomClaimsProvider} from '../extensibility/icustomClaimsProvider';
import {CoreApiClaims} from '../security/coreApiClaims';

/*
 * A default custom claims provider for APIs that only use core claims
 */
export class DefaultCustomClaimsProvider implements ICustomClaimsProvider<CoreApiClaims> {

    public async addCustomClaims(accessToken: string, claims: CoreApiClaims): Promise<void> {
    }
}
