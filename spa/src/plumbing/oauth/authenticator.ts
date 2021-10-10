import {InMemoryWebStorage, UserManager, WebStorageStateStore} from 'oidc-client';
import urlparse from 'url-parse';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {ErrorCodes} from '../errors/errorCodes';
import {ErrorHandler} from '../errors/errorHandler';
import {HtmlStorageHelper} from '../utilities/htmlStorageHelper';

/*
 * The entry point for initiating login and token requests
 */
export class Authenticator {

    private readonly _configuration: OAuthConfiguration;
    private readonly _userManager: UserManager;

    public constructor(configuration: OAuthConfiguration) {

        // Create OIDC settings from our application configuration
        this._configuration = configuration;
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

            // Renew on the SPA's main URL and do so on demand
            silent_redirect_uri: configuration.redirectUri,
            automaticSilentRenew: false,

            // Our Web UI gets user info from its API, for best extensibility
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
    public async getAccessToken(): Promise<string> {

        // On most calls we just return the existing token from memory
        const user = await this._userManager.getUser();
        if (user && user.access_token) {
            return user.access_token;
        }

        // If a new token is needed or the page is refreshed, try to refresh the access token
        return this.refreshAccessToken();
    }

    /*
     * Try to refresh an access token
     */
    public async refreshAccessToken(): Promise<string> {

        // Avoid an unnecessary refresh attempt when the app first loads
        if (HtmlStorageHelper.isLoggedIn) {

            let user = await this._userManager.getUser();
            if (user && user.refresh_token && user.refresh_token.length > 0) {

                // Refresh the access token using a refresh token
                await this._performAccessTokenRenewalViaRefreshToken();

            } else {

                // Use the traditional SPA solution if the page is reloaded
                await this._performAccessTokenRenewalViaIframeRedirect();
            }

            // Return a renewed access token if found
            user = await this._userManager.getUser();
            if (user && user.access_token) {
                return user.access_token;
            }
        }

        // Otherwise trigger a login redirect
        await this._startLogin();

        // End the API request which brought us here with an error code that can be ignored
        throw ErrorHandler.getFromLoginRequired();
    }

    /*
     * Handle the response from the authorization server
     */
    public async handleLoginResponse(): Promise<void> {
        return this._handleLoginResponse();
    }

    /*
     * Redirect in order to log out at the authorization server and remove vendor cookies
     */
    public async startLogout(): Promise<void> {
        return this._startLogout();
    }

    /*
     * Handler logout notifications from other browser tabs
     */
    public async onExternalLogout(): Promise<void> {

        await this._userManager.removeUser();
        HtmlStorageHelper.isLoggedIn = false;
    }

    /*
     * This method is for testing only, to make the access token in storage act like it has expired
     */
    public async expireAccessToken(): Promise<void> {

        const user = await this._userManager.getUser();
        if (user) {

            user.access_token = 'x' + user.access_token + 'x';
            this._userManager.storeUser(user);
        }
    }

    /*
     * Do the interactive login redirect on the main window
     */
    private async _startLogin(): Promise<void> {

        // Otherwise start a login redirect, by first storing the SPA's client side location
        // Some apps might also want to store form fields being edited in the state parameter
        const data = {
            hash: location.hash.length > 0 ? location.hash : '#',
        };

        try {
            
            // Start a login redirect
            await this._userManager.signinRedirect({
                state: data,
            });

        } catch (e) {

            // Handle OAuth specific errors, such as those calling the metadata endpoint
            throw ErrorHandler.getFromLoginOperation(e, ErrorCodes.loginRequestFailed);
        }
    }

    /*
     * Handle the response from the authorization server
     */
    private async _handleLoginResponse(): Promise<void> {

        // If the page loads with a state query parameter we classify it as an OAuth response
        const urlData = urlparse(location.href, true);
        if (urlData.query && urlData.query.state) {

            // Only try to process a login response if the state exists
            const storedState = await this._userManager.settings.stateStore?.get(urlData.query.state);
            if (storedState) {

                let redirectLocation = '#';
                try {

                    // Handle the login response
                    const user = await this._userManager.signinRedirectCallback();

                    // We will return to the app location before the login redirect
                    redirectLocation = user.state.hash;

                    // Set the logged in flag
                    HtmlStorageHelper.isLoggedIn = true;
                    HtmlStorageHelper.multiTabLogout = false;

                } catch (e) {

                    // Handle and rethrow OAuth response errors
                    throw ErrorHandler.getFromLoginOperation(e, ErrorCodes.loginResponseFailed);

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
    private async _startLogout(): Promise<void> {

        try {

            // Use a standard end session request redirect
            await this._userManager.signoutRedirect();

            // Update the state for this app and notify other tabs
            HtmlStorageHelper.isLoggedIn = false;
            HtmlStorageHelper.multiTabLogout = true;

        } catch (e) {

            // Handle failures
            throw ErrorHandler.getFromLogoutOperation(e, ErrorCodes.logoutRequestFailed);
        }
    }

    /*
     * Try to refresh the access token by manually triggering a silent token renewal on an iframe
     * This will fail if there is no authorization server session cookie yet
     * It will also fail in the Safari browser
     * It may also fail if there has been no top level redirect yet for the current browser session
     */
    private async _performAccessTokenRenewalViaIframeRedirect(): Promise<void> {

        try {

            // Redirect on an iframe using the Authorization Server session cookie and prompt=none
            // This instructs the Authorization Server to not render the login page on the iframe
            // If the request fails there should be a login_required error returned from the Authorization Server
            await this._userManager.signinSilent();

        } catch (e: any) {

            if (e.error === ErrorCodes.loginRequired) {

                // Clear token data and our code will then trigger a new login redirect
                await this._userManager.removeUser();

            } else {

                // Rethrow any technical errors
                throw ErrorHandler.getFromTokenError(e, ErrorCodes.tokenRenewalError);
            }
        }
    }

    /*
     * It is not recommended to use a refresh token in the browser, even when stored only in memory, as in this sample
     * The browser cannot store a long lived token securely and malicious code could potentially access it
     * Cognito provides no option to disable refresh tokens for SPAs
     */
    private async _performAccessTokenRenewalViaRefreshToken(): Promise<void> {

        try {

            // The library will use the refresh token grant to get a new access token
            await this._userManager.signinSilent();

        } catch (e: any) {

            // When the session expires this will fail with an 'invalid_grant' response
            if (e.error === ErrorCodes.sessionExpired) {

                // Clear token data and our code will then trigger a new login redirect
                await this._userManager.removeUser();

            } else {

                // Rethrow any technical errors
                throw ErrorHandler.getFromTokenError(e, ErrorCodes.tokenRenewalError);
            }
        }
    }
}
