import {InMemoryWebStorage, UserManager, WebStorageStateStore} from 'oidc-client';
import urlparse from 'url-parse';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {ErrorCodes} from '../errors/errorCodes';
import {ErrorFactory} from '../errors/errorFactory';
import {HtmlStorageHelper} from '../utilities/htmlStorageHelper';

/*
 * The entry point for initiating login and token requests
 */
export class Authenticator {

    private readonly _userManager: UserManager;

    public constructor(configuration: OAuthConfiguration) {

        // Create OIDC settings from our application configuration
        const settings = {

            // The OpenID Connect base URL
            authority: configuration.authority,

            // Core OAuth settings for our app
            client_id: configuration.clientId,
            redirect_uri: configuration.redirectUri,
            scope: configuration.scope,

            // Use the Authorization Code Flow (PKCE)
            response_type: 'code',

            // Tokens are stored only in memory, which is better from a security viewpoint
            userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),

            // Store redirect state such as PKCE verifiers in session storage, for more reliable cleanup
            stateStore: new WebStorageStateStore({ store: sessionStorage }),

            // The SPA handles 401 errors and does not do silent token renewal in the background
            silent_redirect_uri: configuration.redirectUri,
            automaticSilentRenew: false,

            // The SPA's access token cannot get graph user info directly
            // Therefore the SPA gets OAuth user info from an API endpoint
            loadUserInfo: false,

            // Indicate the logout return path and listen for logout events from other browser tabs
            post_logout_redirect_uri: configuration.postLogoutRedirectUri,
        };

        // Create the user manager
        this._userManager = new UserManager(settings);
    }

    /*
     * Get an access token and login if required
     */
    public async getAccessToken(): Promise<string | null> {

        // On most calls we just return the existing token from memory
        const user = await this._userManager.getUser();
        if (user && user.access_token) {
            return user.access_token;
        }

        // If the page has been reloaded, try a silent refresh to get an access token
        return await this.refreshAccessToken();
    }

    /*
     * Try to refresh an access token
     */
    public async refreshAccessToken(): Promise<string | null> {

        // This flag avoids an unnecessary refresh attempt when the app first loads
        if (HtmlStorageHelper.isLoggedIn) {

            // Use the traditional SPA solution if the page is reloaded
            await this._performAccessTokenRenewalViaIframeRedirect();

            // Return an access token if renewal was successful
            // The SPA does not use refresh tokens, so remove one if received, to ensure iframe renewal
            const user = await this._userManager.getUser();
            if (user) {

                if (user.refresh_token) {
                    user.refresh_token = '';
                    this._userManager.storeUser(user);
                }

                if (user.access_token) {
                    return user.access_token;
                }
            }
        }

        return null;
    }

    /*
     * Do the interactive login redirect on the main window
     */
    public async startLogin(): Promise<void> {

        // Start a login redirect, by first storing the SPA's client side location
        // Some apps might also want to store form fields being edited in the state parameter
        const data = {
            hash: location.hash.length > 0 ? location.hash : '#',
        };

        try {

            // Start a login redirect
            await this._userManager.signinRedirect({
                state: data,
            });

        } catch (e: any) {

            // Handle OAuth specific errors, such as those calling the metadata endpoint
            throw ErrorFactory.getFromLoginOperation(e, ErrorCodes.loginRequestFailed);
        }
    }

    /*
     * Handle the response from the authorization server
     */
    public async handleLoginResponse(): Promise<void> {

        // If the page loads with a state query parameter we classify it as an OAuth response
        const urlData = urlparse(location.href, true);
        if (urlData.query && urlData.query.state) {

            // Only try to process a login response if the state exists
            const storedState = await this._userManager.settings.stateStore?.get(urlData.query.state);
            if (storedState) {

                let redirectLocation = '#';
                try {

                    // Handle the login response and save tokens to memory
                    const user = await this._userManager.signinRedirectCallback();
                    user.refresh_token = '';
                    this._userManager.storeUser(user);

                    // We will return to the app location before the login redirect
                    redirectLocation = user.state.hash;

                    // Update login state
                    HtmlStorageHelper.isLoggedIn = true;

                } catch (e: any) {

                    // Handle and rethrow OAuth response errors
                    throw ErrorFactory.getFromLoginOperation(e, ErrorCodes.loginResponseFailed);

                } finally {

                    // Always replace the browser location, to remove OAuth details from back navigation
                    history.replaceState({}, document.title, redirectLocation);
                }
            }
        }
    }

    /*
     * Redirect in order to log out at the authorization server and remove the session cookie
     */
    public async startLogout(): Promise<void> {

        try {

            // Instruct other tabs to logout
            HtmlStorageHelper.raiseLoggedOutEvent();

            // Use a standard end session request redirect
            await this._userManager.signoutRedirect();

        } catch (e: any) {

            // Handle failures
            throw ErrorFactory.getFromLogoutOperation(e, ErrorCodes.logoutRequestFailed);
        }
    }

    /*
     * Handler logout notifications from other browser tabs
     */
    public async onExternalLogout(): Promise<void> {
        await this._resetDataOnLogout();
    }

    /*
     * This method is for testing only, to make the access token in storage act like it has expired
     */
    public async expireAccessToken(): Promise<void> {

        const user = await this._userManager.getUser();
        if (user) {

            // Add a character to the signature to make it fail validation
            user.access_token = `${user.access_token}x`;
            this._userManager.storeUser(user);
        }
    }

    /*
     * Try to refresh the access token by manually triggering a silent token renewal on an iframe
     * This will fail if there is no authorization server SSO cookie yet
     * It will fail in some browsers, which will not send the 3rd party SSO cookie due to RFC6265bis restrictions
     * It may also fail if there has been no top level redirect yet for the current browser session
     * The top level redirect may serve as a user gesture after which the browser also sends the SSO cookie silently
     */
    private async _performAccessTokenRenewalViaIframeRedirect(): Promise<void> {

        try {

            // Redirect on an iframe using the authorization server session cookie and prompt=none
            // This instructs the authorization server to not render the login page on the iframe
            // If the request fails there should be a login_required error returned from the Authorization Server
            await this._userManager.signinSilent();

        } catch (e: any) {

            if (e.error === ErrorCodes.loginRequired) {

                // Clear token data and our code will then trigger a new login redirect
                await this._userManager.removeUser();

            } else {

                // Rethrow any technical errors
                throw ErrorFactory.getFromTokenError(e, ErrorCodes.tokenRenewalError);
            }
        }
    }

    /*
     * Clean data when the session expires or the user logs out
     */
    private async _resetDataOnLogout(): Promise<void> {

        await this._userManager.removeUser();
        HtmlStorageHelper.isLoggedIn = false;
    }
}
