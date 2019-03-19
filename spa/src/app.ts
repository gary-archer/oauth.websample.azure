import * as $ from 'jquery';
import {Configuration} from './configuration/configuration';
import {ErrorView} from './logic/errorView';
import {Router} from './logic/router';
import {TraceView} from './logic/traceView';
import {UIError} from './plumbing/errors/uiError';
import {Authenticator} from './plumbing/oauth/authenticator';
import {HttpClient} from './plumbing/utilities/httpClient';

/*
 * The application class
 */
class App {

    /*
     * The app uses a global instance of OIDC Client and a global router class
     */
    private _authenticator!: Authenticator;
    private _router!: Router;

    /*
     * Class setup
     */
    public constructor() {

        (window as any).$ = $;
        this._setupCallbacks();
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

        try {
            // Download configuration and set up authentication
            const config = await this._downloadSpaConfig();
            const tokenSigningKeys = await this._downloadTokenSigningKeys(config);
            this._configureAuthentication(config, tokenSigningKeys);

            // We must be prepared for page invocation to be an OAuth login response
            await this._handleLoginResponse();

            // Get claims from our API to display the logged in user
            await this._getUserClaims();

            // Execute the main view at the current hash location
            await this._runPage();

        } catch (e) {

            // Render the error view if there are problems
            ErrorView.execute(e);

        } finally {

            // After the initial load, regardless of success, start listening for hash changes
            $(window).on('hashchange', this._onHashChange);
        }
    }

    /*
     * Download application configuration
     */
    private async _downloadSpaConfig(): Promise<Configuration> {
        return await HttpClient.loadAppConfiguration('spa.config.json');
    }

    /*
     * Download token signing keys from our API to work around Azure AD limitations
     */
    private async _downloadTokenSigningKeys(config: Configuration): Promise<any> {
        const url = `${config.app.apiBaseUrl}/unsecure/tokensigningkeys`;
        return await HttpClient.loadTokenSigningKeys(url);
    }

    /*
     * Initialise authentication related processing
     */
    private _configureAuthentication(config: Configuration, tokenSigningKeys: any): void {

        // Initialise our OIDC Client wrapper and configure OIDC Client logging
        this._authenticator = new Authenticator(config.oauth, tokenSigningKeys, this._onBackgroundError);
        TraceView.initialize();

        // Our simple router uses the authenticator to get tokens and passes it between views
        this._router = new Router(config.app.apiBaseUrl, this._authenticator);
    }

    /*
     * Handle login responses on page load so that we have tokens and can call APIs
     */
    private async _handleLoginResponse(): Promise<void> {
        await this._authenticator.handleLoginResponse();
    }

    /*
     * Get and display user claims from the API, which can contain any data we need, not just token data
     * User info is then rendered in our page
     */
    private async _getUserClaims(): Promise<void> {
        await this._router.executeUserInfoView();
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

        TraceView.updateLevelIfRequired();

        try {
            await this._router.executeView();
        } catch (e) {
            ErrorView.execute(e);
        }
    }

    /*
     * This forces the On Home button to always do a reload of the current view after errors
     */
    private _onHome(): void {

        if (!this._router) {

            // If we don't have a router yet, reload the whole page
            location.reload();
        } else {

            // Otherwise update the hash location
            if (location.hash !== '#home') {
                location.hash = '#home';
            } else {
                location.hash = '#';
            }
        }
    }

    /*
     * Force data reload
     */
    private async _onRefreshData(): Promise<void> {
        try {
            await this._router.executeView();
        } catch (e) {
            ErrorView.execute(e);
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

        try {
           await this._authenticator.startLogout();
        } catch (e) {
            ErrorView.execute(e);
        }
    }

    /*
     * Report background errors during silent token renewal
     */
    private _onBackgroundError(error: UIError): void {
        ErrorView.execute(error);
    }

    /*
     * Clear error output
     */
    private _onClearError(): void {
        ErrorView.clear();
    }

    /*
     * Clear trace output
     */
    private _onClearTrace(): void {
        TraceView.clear();
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
