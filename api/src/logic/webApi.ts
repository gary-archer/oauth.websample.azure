import * as cors from 'cors';
import {Application, NextFunction, Request, Response} from 'express';
import {Configuration} from '../configuration/configuration';
import {Authenticator} from '../plumbing/authenticator';
import {ClaimsMiddleware} from '../plumbing/claimsMiddleware';
import {DebugProxyAgent} from '../plumbing/debugProxyAgent';
import {ErrorHandler} from '../plumbing/errorHandler';
import {JsonReader} from '../plumbing/jsonReader';
import {ResponseWriter} from '../plumbing/responseWriter';
import {AuthorizationMicroservice} from './authorizationMicroservice';
import {CompanyController} from './companyController';
import {CompanyRepository} from './companyRepository';
import {SigningKeysController} from './signingKeysController';
import {UserInfoController} from './userInfoController';

/*
 * A Web API class to manage routes
 */
export class WebApi {

    /*
     * Fields
     */
    private _expressApp: Application;
    private _apiConfig: Configuration;

    /*
     * Class setup
     */
    public constructor(expressApp: Application, apiConfig: Configuration) {

        // Basic class setup
        this._expressApp = expressApp;
        this._apiConfig = apiConfig;

        // Allow cross origin requests from the SPA
        const corsOptions = { origin: apiConfig.app.trustedOrigins };
        this._expressApp.use('/api/*', cors(corsOptions));

        // For the code sample's ease of debugging we'll turn off caching
        this._expressApp.set('etag', false);

        // Initialize the API
        DebugProxyAgent.initialize();
        this._setupCallbacks();
    }

    /*
     * Set up Web API routes
     */
    public configureRoutes(): void {

        // All API requests are authorized first
        this._expressApp.use('/api/*', this._authorizeRequest);

        // An unsecured method to download token signing keys, and work around CORS Azure restrictions
        this._expressApp.get('/api/unsecure/tokensigningkeys', this._getTokenSigningKeys);

        // API routes containing business logic
        this._expressApp.get('/api/userclaims/current', this._getUserClaims);
        this._expressApp.get('/api/companies', this._getCompanyList);
        this._expressApp.get('/api/companies/:id([0-9]+/transactions)', this._getCompanyTransactions);

        // Our exception middleware handles all exceptions
        this._expressApp.use('/api/*', this._unhandledExceptionMiddleware);
    }

    /*
     * Make an HTTPS request to get the keys then download them to the UI
     */
    private async _getTokenSigningKeys(request: Request, response: Response, next: NextFunction): Promise<void> {

        try {
            const authenticator = new Authenticator(this._apiConfig.oauth);
            const controller = new SigningKeysController(authenticator);
            await controller.getTokenSigningKeys(request, response);
        } catch (e) {
            this._unhandledExceptionMiddleware(e, request, response);
        }
    }

    /*
     * The first middleware is for token validation and claims handling, which occurs before business logic
     */
    private async _authorizeRequest(request: Request, response: Response, next: NextFunction): Promise<void> {

        if (request.originalUrl.startsWith('/api/unsecure')) {
            next();
            return;
        }

        // Create the middleware instance and its dependencies on every API request
        try {

            // Do the work if this is a new token
            const authenticator = new Authenticator(this._apiConfig.oauth);
            const authorizationMicroservice = new AuthorizationMicroservice();
            const middleware = new ClaimsMiddleware(authenticator, authorizationMicroservice);
            const authorized = await middleware.authorizeRequestAndSetClaims(request, response, next);

            // Only move to the API operation if authorized
            if (authorized) {
                next();
            }

        } catch (e) {
            this._unhandledExceptionMiddleware(e, request, response);
        }
    }

    /*
     * Set up the user claims API operation
     */
    private async _getUserClaims(
        request: Request,
        response: Response,
        next: NextFunction): Promise<void> {

        // Create the controller instance and its dependencies on every API request
        try {
            const controller = new UserInfoController();
            await controller.getUserClaims(request, response);
        } catch (e) {
            this._unhandledExceptionMiddleware(e, request, response);
        }
    }

    /*
     * Set up the company list API operation
     */
    private async _getCompanyList(
        request: Request,
        response: Response,
        next: NextFunction): Promise<void> {

        // Create the controller instance and its dependencies on every API request
        try {
            const reader = new JsonReader();
            const repository = new CompanyRepository(response.locals.claims, reader);
            const controller = new CompanyController(repository);
            await controller.getCompanyList(request, response);
        } catch (e) {
            this._unhandledExceptionMiddleware(e, request, response);
        }
    }

    /*
     * Set up the company transactions API operation
     */
    private async _getCompanyTransactions(
        request: Request,
        response: Response,
        next: NextFunction): Promise<void> {

        // Create the controller instance and its dependencies on every API request
        try {
            const reader = new JsonReader();
            const repository = new CompanyRepository(response.locals.claims, reader);
            const controller = new CompanyController(repository);
            await controller.getCompanyTransactions(request, response);
        } catch (e) {
            this._unhandledExceptionMiddleware(e, request, response);
        }
    }

    /*
     * The entry point for handling exceptions forwards all exceptions to our handler class
     */
    private _unhandledExceptionMiddleware(
        unhandledException: any,
        request: Request,
        response: Response): void {

        const clientError = ErrorHandler.handleError(unhandledException);
        ResponseWriter.writeObject(response, clientError.statusCode, clientError.toResponseFormat());
    }

    /*
     * Set up async callbacks
     */
    private _setupCallbacks(): void {
        this._getTokenSigningKeys = this._getTokenSigningKeys.bind(this);
        this._authorizeRequest = this._authorizeRequest.bind(this);
        this._getUserClaims = this._getUserClaims.bind(this);
        this._getCompanyList = this._getCompanyList.bind(this);
        this._getCompanyTransactions = this._getCompanyTransactions.bind(this);
        this._unhandledExceptionMiddleware = this._unhandledExceptionMiddleware.bind(this);
    }
}
