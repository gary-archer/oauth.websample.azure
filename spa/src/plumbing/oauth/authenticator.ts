import {InMemoryWebStorage, UserManager, WebStorageStateStore} from 'oidc-client';
import urlparse from 'url-parse';
import {OAuthConfiguration} from '../../configuration/oauthConfiguration';
import {ErrorCodes} from '../errors/errorCodes';
import {ErrorHandler} from '../errors/errorHandler';
import {HtmlStorageHelper} from '../utilities/htmlStorageHelper';
import {UrlHelper} from '../utilities/urlHelper';

/*
 * The entry point for initiating login and token requests
 */
export class Authenticator {

    private readonly _userManager: UserManager;

    public constructor(
        webBaseUrl: string,
        configuration: OAuthConfiguration,
        onExternalTabLogout: () => void) {

        // Create OIDC settings from our application configuration
        const settings = {

            // The Open Id Connect base URL
            authority: configuration.authority,

            // Core OAuth settings for our app
            client_id: configuration.clientId,
            redirect_uri: UrlHelper.append(webBaseUrl, configuration.redirectUri),
            scope: configuration.scope,

            // Use the Authorization Code Flow (PKCE)
            response_type: 'code',

            // Tokens are stored only in memory, which is better from a security viewpoint
            userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),

            // Store redirect state such as PKCE verifiers in session storage, for more reliable cleanup
            stateStore: new WebStorageStateStore({ store: sessionStorage }),

            // Renew on the app's main URL and do so explicitly rather than via a background timer
            silent_redirect_uri: UrlHelper.append(webBaseUrl, configuration.redirectUri),
            automaticSilentRenew: false,

            // Our Web UI gets user info from its API, so that it is not limited to only OAuth user info
            loadUserInfo: false,

            // Indicate the logout return path and listen for logout events from other browser tabs
            post_logout_redirect_uri: UrlHelper.append(webBaseUrl, configuration.postLogoutRedirectUri),
            monitorSession: true,
        };

        // Create the user manager
        this._userManager = new UserManager(settings);

        // When the user signs out from another browser tab, also remove tokens from this browser tab
        // This will only work if the Authorization Server has a check_session_iframe endpoint
        this._userManager.events.addUserSignedOut(async () => {
            this._userManager.removeUser();
            onExternalTabLogout();
        });
    }

    /*
     * Get an access token and login if required
     */
    public async getAccessToken(): Promise<string> {

        // If not logged in on any browser tab, do not return a token
        // This ensures that Tab B does not continue working after a logout on Tab A
        if (HtmlStorageHelper.isLoggedIn) {

            // On most calls we just return the existing token from memory
            const user = await this._userManager.getUser();
            if (user && user.access_token) {
                return user.access_token;
            }
        }

        // If a new token is needed or the page is reloaded, try to refresh the access token
        return await this.refreshAccessToken();
    }

    /*
     * Try to refresh an access token
     */
    public async refreshAccessToken(): Promise<string> {

        // If not logged in on any browser tab, do not try an iframe redirect, to avoid slowness
        if (HtmlStorageHelper.isLoggedIn) {

            // Try to do a token refresh
            await this._performTokenRefresh();

            // Return the renewed access token if found
            const user = await this._userManager.getUser();
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
     * This method is for testing only, to make the refresh token in storage act like it has expired
     */
    public async expireRefreshToken(): Promise<void> {

        await this.expireAccessToken();
        const user = await this._userManager.getUser();
        if (user) {

            user.refresh_token = 'x' + user.refresh_token + 'x';
            this._userManager.storeUser(user);
        }
    }

    /*
     * Do the interactive login redirect on the main window
     */
    private async _startLogin(): Promise<void> {

        // First store the SPA's client side location
        // Some apps might also want to store form fields being edited in the state parameter
        const data = {
            hash: location.hash.length > 0 ? location.hash : '#',
        };

        try {
            // Start a login redirect
            await this._userManager.signinRedirect({state: data});

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

            // Only try to process a login response if the state exists, to avoid user errors
            const storedState = await this._userManager.settings.stateStore?.get(urlData.query.state);
            if (storedState) {

                let redirectLocation = '#';
                try {

                    // Handle the login response
                    const user = await this._userManager.signinRedirectCallback();

                    // Get the hash URL before the login redirect
                    redirectLocation = user.state.hash;

                    // Set the logged in flag, which prevents unnecessary iframe redirects
                    HtmlStorageHelper.isLoggedIn = true;

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
            // Do the redirect
            await this._userManager.signoutRedirect();

            // Remove the logged in flag, and other browser tabs will then act logged out
            HtmlStorageHelper.removeLoggedIn();

        } catch (e) {

            // Handle failures
            throw ErrorHandler.getFromLogoutOperation(e, ErrorCodes.logoutRequestFailed);
        }
    }

    /*
     * Try to refresh the access token with the refresh token when available
     * Note that on page reloads or when opening new tabs there will be no refresh token
     * In this case we use iframe based token renewal instead
     */
    private async _performTokenRefresh(): Promise<void> {

        try {

            // Ask the OIDC client to do the work of the token refresh
            // A different scope could be requested by also supplying an object with a scope= property
            await this._userManager.signinSilent();

        } catch (e) {

            // The session expires with an invalid_grant error for refresh token grant messages
            // The session expires with a login_required error iframe renewal redirects
            if (e.error === ErrorCodes.loginRequired || e.message === ErrorCodes.invalidGrant) {

                // For session expired errors, clear token data and return success, to force a login redirect
                await this._userManager.removeUser();

            } else {

                // Rethrow other errors
                throw ErrorHandler.getFromTokenError(e, ErrorCodes.tokenRenewalError);
            }
        }
    }
}
