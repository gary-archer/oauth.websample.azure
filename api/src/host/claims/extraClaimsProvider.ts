import {JWTPayload} from 'jose';
import {ExtraClaims} from '../../logic/entities/claims/extraClaims.js';
import {ClaimsReader} from './claimsReader.js';

/*
 * Add extra claims that you cannot, or do not want to, manage in the authorization server
 */
export class ExtraClaimsProvider {

    /*
     * Get claims from the API's own database based on the subkect claim in an AWS Cognito access token
     */
    public async lookupExtraClaims(jwtClaims: JWTPayload): Promise<ExtraClaims> {

        // Azure AD uses a PPID as the subject claim, which is different per application and a secure default
        // For a unique value that is the same across multiple apps, the object ID can be used
        const subject = ClaimsReader.getClaim(jwtClaims['oid'] as string, 'oid');

        // A real API would use a database, but this API uses a mock implementation
        if (subject === 'a724f361-38df-47b6-aa99-13723f77c47a') {

            // These claims are used for the guestadmin user account
            return new ExtraClaims('20116', 'admin', 'Global Manager', ['Europe', 'USA', 'Asia']);

        } else {

            // These claims are used for the guestuser user account
            return new ExtraClaims('10345', 'user', 'Regional Manager', ['USA']);
        }
    }
}
