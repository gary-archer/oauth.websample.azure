import {NextFunction, Request, Response} from 'express';
import onHeaders from 'on-headers';
import {ClaimsPrincipal} from '../../logic/entities/claims/claimsPrincipal.js';
import {ClientError} from '../../logic/errors/clientError.js';
import {ErrorCodes} from '../../logic/errors/errorCodes.js';
import {CompanyRepository} from '../../logic/repositories/companyRepository.js';
import {CompanyService} from '../../logic/services/companyService.js';
import {UserInfoService} from '../../logic/services/userInfoService.js';
import {JsonFileReader} from '../../logic/utilities/jsonFileReader.js';
import {ClaimsCache} from '../claims/claimsCache.js';
import {ExtraClaimsProvider} from '../claims/extraClaimsProvider.js';
import {Configuration} from '../configuration/configuration.js';
import {ErrorFactory} from '../errors/errorFactory.js';
import {ExceptionHandler} from '../errors/exceptionHandler.js';
import {Authorizer} from '../oauth/authorizer.js';
import {JwksRetriever} from '../oauth/jwksRetriever.js';
import {OAuthClient} from '../oauth/oauthClient.js';
import {HttpProxy} from '../utilities/httpProxy.js';
import {ResponseWriter} from '../utilities/responseWriter.js';

/*
 * A class to route API requests to business logic classes
 */
export class ApiController {

    private readonly _configuration: Configuration;
    private readonly _oauthClient: OAuthClient;
    private readonly _claimsCache: ClaimsCache;
    private readonly _httpProxy: HttpProxy;

    public constructor(configuration: Configuration) {

        this._configuration = configuration;
        this._httpProxy = new HttpProxy(this._configuration);
        const jwksRetriever = new JwksRetriever(this._configuration.oauth, this._httpProxy);
        this._oauthClient = new OAuthClient(this._configuration.oauth, jwksRetriever, this._httpProxy);
        this._claimsCache = new ClaimsCache(this._configuration.oauth);
        this._setupCallbacks();
    }

    /*
     * The entry point for authorization and claims handling
     */
    public async authorizationHandler(request: Request, response: Response, next: NextFunction): Promise<void> {

        // Create authorization related classes on every API request
        const extraClaimsProvider = new ExtraClaimsProvider();
        const authorizer = new Authorizer(this._claimsCache, this._oauthClient, extraClaimsProvider);

        // Call the authorizer to do the work
        const claims = await authorizer.authorizeRequestAndGetClaims(request);

        // On success, set claims against the request context and move on to the service logic
        response.locals.claims = claims;
        next();
    }

    /*
     * Return OAuth user info, with user attributes stored in the authorization server
     */
    public async getOAuthUserInfo(request: Request, response: Response): Promise<void> {

        // Create a user service and ask it for the user info
        const claims = this._getClaims(response);
        const service = new UserInfoService(claims);
        const oauthUserInfo = await service.getOAuthUserInfo()
        ResponseWriter.writeSuccessResponse(response, 200, oauthUserInfo);
    }

    /*
     * Return API user info, with user attributes stored in the API's own data
     */
    public async getApiUserInfo(request: Request, response: Response): Promise<void> {

        // Create a user service and ask it for the user info
        const claims = this._getClaims(response);
        const service = new UserInfoService(claims);
        ResponseWriter.writeSuccessResponse(response, 200, service.getApiUserInfo());
    }

    /*
     * Return a list of companies
     */
    public async getCompanyList(request: Request, response: Response): Promise<void> {

        // Create the service instance and its dependencies on every API request
        const claims = this._getClaims(response);
        const reader = new JsonFileReader();
        const repository = new CompanyRepository(reader);
        const service = new CompanyService(repository, claims);

        // Get the data and return it in the response
        const result = await service.getCompanyList();
        ResponseWriter.writeSuccessResponse(response, 200, result);
    }

    /*
     * Return company transactions
     */
    public async getCompanyTransactions(request: Request, response: Response): Promise<void> {

        // Create the service instance and its dependencies on every API request
        const claims = this._getClaims(response);
        const reader = new JsonFileReader();
        const repository = new CompanyRepository(reader);
        const service = new CompanyService(repository, claims);

        // Get the supplied id as a number, and return 400 if invalid input was received
        const id = parseInt(request.params.id, 10);
        if (isNaN(id) || id <= 0) {
            throw new ClientError(
                400,
                ErrorCodes.invalidCompanyId,
                'The company id must be a positive numeric integer');
        }

        const result = await service.getCompanyTransactions(id);
        ResponseWriter.writeSuccessResponse(response, 200, result);
    }

    /*
     * Remove the ETag header from API responses
     */
    /* eslint-disable @typescript-eslint/no-unused-vars */
    public onWriteHeaders(
        request: Request,
        response: Response,
        next: NextFunction): void {

        onHeaders(response, () => response.removeHeader('ETag'));
        next();
    }

    /*
     * Handle requests to routes that do not exist, by logging the error and returning a client response
     */
    /* eslint-disable @typescript-eslint/no-unused-vars */
    public onRequestNotFound(
        request: Request,
        response: Response,
        next: NextFunction): void {

        const clientError = ErrorFactory.fromRequestNotFound();
        ExceptionHandler.handleError(clientError, response);
        ResponseWriter.writeErrorResponse(response, clientError);
    }

    /*
     * Handle exceptions thrown by the API, by logging the error and returning a client response
     */
    public onException(
        unhandledException: any,
        request: Request,
        response: Response): void {

        const clientError = ExceptionHandler.handleError(unhandledException, response);
        ResponseWriter.writeErrorResponse(response, clientError);
    }

    /*
     * A helper utility to get typed claims
     */
    private _getClaims(response: Response): ClaimsPrincipal {
        return response.locals.claims;
    }

    /*
     * Set up async callbacks
     */
    private _setupCallbacks(): void {
        this.authorizationHandler = this.authorizationHandler.bind(this);
        this.getOAuthUserInfo = this.getOAuthUserInfo.bind(this);
        this.getApiUserInfo = this.getApiUserInfo.bind(this);
        this.getCompanyList = this.getCompanyList.bind(this);
        this.getCompanyTransactions = this.getCompanyTransactions.bind(this);
    }
}
