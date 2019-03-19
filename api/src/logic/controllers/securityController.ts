import {inject} from 'inversify';
import {BaseHttpController, controller, httpGet} from 'inversify-express-utils';
import {Authenticator, FRAMEWORKTYPES} from '../../framework';

/*
 * A controller class to return token signing keys
 * This works around Azure limitations where the JWKS endpoint is not callable from a browser
 */
@controller('/unsecure')
export class SecurityController extends BaseHttpController {

    private readonly _authenticator: Authenticator;

    /*
     * Receive the authenticator class, which makes remote calls to the Authorization Server
     */
    public constructor(@inject(FRAMEWORKTYPES.Authenticator) authenticator: Authenticator) {
        super();
        this._authenticator = authenticator;
    }

    /*
     * Download token signing keys via a double hop
     */
    @httpGet('/tokensigningkeys')
    private async get(): Promise<any> {
        return await this._authenticator.getTokenSigningKeys();
    }
}
