import * as $ from 'jquery';
import {Configuration} from '../configuration/configuration';
import {Authenticator} from '../plumbing/authenticator';
import {ErrorHandler} from '../plumbing/errorHandler';
import {HttpClient} from '../plumbing/httpClient';
import {OAuthLogger} from '../plumbing/oauthLogger';
import {Router} from './router';

/*
 * The application class
 */
class App {

    /*
     * Fields
     */
    private _spaConfig: Configuration | null;
    private _authenticator: Authenticator | null;
    private _router: Router | null;

    /*
     * Class setup
     */
    public constructor() {

        (window as any).$ = $;
        this._setupCallbacks();

        this._spaConfig = null;
        this._authenticator = null;
        this._router = null;
    }

    /*
     * The entry point for the SPA
     */
    public async execute(): Promise<void> {

        // Set up click handlers
        $('#btnHome').click(this._onHome);
        $('#btnRefreshData').click(this._onRefreshData);
        $('#btnExpireAccessToken').click(this._onExpireToken);
        $('#btnLogout').click(this._onLogout);
        $('#btnClearError').click(this._onClearError);
        $('#btnClearTrace').click(this._onClearTrace);

        // Download configuration, then handle login, then handle login responses
        try {
            await this._downloadSpaConfig();
            await this._downloadTokenSigningKeys();
            await this._configureAuthentication();
            await this._handleLoginResponse();
            await this._getUserClaims();
            await this._runPage();
        } catch (e) {
            ErrorHandler.reportError(e);
        }
    }

    /*
     * Download application configuration
     */
    private async _downloadSpaConfig(): Promise<void> {
        this._spaConfig = await HttpClient.loadAppConfiguration('spa.config.json');
    }

    /*
     * Download token signing keys from our API to work around Azure AD limitations
     */
    private async _downloadTokenSigningKeys(): Promise<void> {
        const url = `${this._spaConfig!.app.apiBaseUrl}/unsecure/tokensigningkeys`;
        this._spaConfig!.oauth.tokenSigningKeys = await HttpClient.loadTokenSigningKeys(url);
    }

    /*
     * Point OIDC logging to our application logger and then supply OAuth settings
     */
    private _configureAuthentication(): void {
        this._authenticator = new Authenticator(this._spaConfig!.oauth);
        OAuthLogger.initialize();
        this._router = new Router(this._spaConfig!.app.apiBaseUrl, this._authenticator);
    }

    /*
     * Handle login responses on page load so that we have tokens and can call APIs
     */
    private async _handleLoginResponse(): Promise<void> {

        // Receive tokens
        await this._authenticator!.handleLoginResponse();

        // Enable hash change events after any login responses have been processed
        $(window).on('hashchange', this._onHashChange);
    }

    /*
     * Download user claims from the API, which can contain any data we like
     */
    private async _getUserClaims(): Promise<void> {
        await this._router!.executeUserInfoView();
    }

    /*
     * Once login processing has completed, start listening for hash changes
     */
    private async _runPage(): Promise<void> {
        await this._router!.executeView();
    }

    /*
     * Change the view based on the hash URL and catch errors
     */
    private async _onHashChange(): Promise<void> {

        OAuthLogger.updateLevelIfRequired();

        try {
            await this._router!.executeView();
        } catch (e) {
            ErrorHandler.reportError(e);
        }
    }

    /*
     * Button handler to reset the hash location to the list view and refresh
     */
    private _onHome(): void {
        this._router!.moveHome();
    }

    /*
     * Force a page reload
     */
    private async _onRefreshData(): Promise<void> {
        try {
            await this._router!.executeView();
        } catch (e) {
            ErrorHandler.reportError(e);
        }
    }

    /*
     * Force a new access token to be retrieved
     */
    private async _onExpireToken(): Promise<void> {
        await this._authenticator!.expireAccessToken();
    }

    /*
     * Start a logout request
     */
    private async _onLogout(): Promise<void> {
        await this._authenticator!.startLogout();
    }

    /*
     * Clear error output
     */
    private _onClearError(): void {
        ErrorHandler.clear();
    }

    /*
     * Clear trace output
     */
    private _onClearTrace(): void {
        OAuthLogger.clear();
    }

    /*
     * Plumbing to ensure that the this parameter is available in async callbacks
     */
    private _setupCallbacks(): void {
        this._configureAuthentication = this._configureAuthentication.bind(this);
        this._handleLoginResponse = this._handleLoginResponse.bind(this);
        this._getUserClaims = this._getUserClaims.bind(this);
        this._runPage = this._runPage.bind(this);
        this._onHashChange = this._onHashChange.bind(this);
        this._onHome = this._onHome.bind(this);
        this._onRefreshData = this._onRefreshData.bind(this);
        this._onExpireToken = this._onExpireToken.bind(this);
        this._onLogout = this._onLogout.bind(this);
   }
}

/*
 * Run the application
 */
const app = new App();
app.execute();
