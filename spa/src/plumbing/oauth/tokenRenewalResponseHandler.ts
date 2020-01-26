import {UserManager, UserManagerSettings} from 'oidc-client';
import urlparse from 'url-parse';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';

/*
 * A simple class to manage token renewal
 */
export class TokenRenewalResponseHandler {

    // The OIDC Client class does all of the real security processing
    private readonly _userManager: UserManager;

    /*
     * Initialise OAuth settings and create the UserManager
     */
    public constructor(configuration: OAuthConfiguration) {

        const settings = {
            authority: configuration.authority,
            client_id: configuration.clientId,
            redirect_uri: configuration.appUri,
            scope: configuration.scope,
            response_type: 'code',
            loadUserInfo: false,
        } as UserManagerSettings;

        this._userManager = new UserManager(settings);
    }

    /*
     * Handle token renewal responses from the authorization server
     */
    public async handleSilentTokenRenewalResponse(): Promise<void> {

        // Since we are using the implicit flow we process the hash fragment
        if (location.hash && location.hash.startsWith('#')) {

            // If the page loads with a state query parameter we classify it as an OAuth response
            const urlData = urlparse('?' + location.hash.substring(1), true);
            if (urlData.query && urlData.query.state) {

                // Start processing of the authorization response on the iframe
                // Any errors are reported via the main window's onSilentTokenRenewalError callback
                await this._userManager.signinSilentCallback();
            }
        }
    }
}
