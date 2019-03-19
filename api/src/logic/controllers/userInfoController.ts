import {BaseHttpController, controller, httpGet} from 'inversify-express-utils';
import {BasicApiClaims} from '../entities/basicApiClaims';
import {UserInfoClaims} from '../entities/userInfoClaims';

/*
 * A controller class to return user info
 */
@controller('/userclaims')
export class UserInfoController extends BaseHttpController {

    /*
     * Return any user claims needed by the UI
     */
    @httpGet('/current')
    private get(): UserInfoClaims {

        // We can get claims from the HTTP context
        const claims = this.httpContext.user.details as BasicApiClaims;

        // Return user info to the UI
        return {
            givenName: claims.givenName,
            familyName: claims.familyName,
            email: claims.email,
        } as UserInfoClaims;
    }
}
