import {Application} from 'express';
import {Container} from 'inversify';
import {FrameworkConfiguration} from '../configuration/frameworkConfiguration';
import {UnhandledExceptionHandler} from '../errors/unhandledExceptionHandler';
import {UnhandledPromiseRejectionHandler} from '../errors/unhandledPromiseRejectionHandler';
import {ICustomClaimsProvider} from '../extensibility/icustomClaimsProvider';
import {ILoggerFactory} from '../extensibility/iloggerFactory';
import {LogEntry} from '../logging/logEntry';
import {LoggerMiddleware} from '../logging/loggerMiddleware';
import {AuthenticationFilter} from '../security/authenticationFilter';
import {Authenticator} from '../security/authenticator';
import {ClaimsCache} from '../security/claimsCache';
import {ClaimsMiddleware} from '../security/claimsMiddleware';
import {CoreApiClaims} from '../security/coreApiClaims';
import {IssuerMetadata} from '../security/issuerMetadata';
import {CustomHeaderMiddleware} from '../utilities/customHeaderMiddleware';
import {HttpContextAccessor} from '../utilities/httpContextAccessor';
import {FRAMEWORKTYPES} from './frameworkTypes';

/*
 * A builder style class to configure framework behaviour and to register its dependencies
 */
export class FrameworkInitialiser<TClaims extends CoreApiClaims> {

    // Injected properties
    private readonly _container: Container;
    private readonly _configuration: FrameworkConfiguration;
    private readonly _loggerFactory: ILoggerFactory;

    // Properties set via builder methods
    private _apiBasePath: string;
    private _unsecuredPaths: string[];
    private _claimsSupplier!: () => TClaims;
    private _customClaimsProvider!: () => ICustomClaimsProvider<TClaims>;

    // Calculated properties
    private _issuerMetadata!: IssuerMetadata;
    private _claimsCache!: ClaimsCache<TClaims>;
    private _exceptionHandler!: UnhandledExceptionHandler;
    private _unhandledPromiseRejectionHandler!: UnhandledPromiseRejectionHandler;
    private _httpContextAccessor!: HttpContextAccessor;

    /*
     * Receive base details
     */
    public constructor(
        container: Container,
        configuration: FrameworkConfiguration,
        loggerFactory: ILoggerFactory) {

        this._container = container;
        this._configuration = configuration;
        this._loggerFactory = loggerFactory;
        this._apiBasePath = '/';
        this._unsecuredPaths = [];
    }

    /*
     * Set the API base path, such as /api/
     */
    public withApiBasePath(apiBasePath: string): FrameworkInitialiser<TClaims> {

        this._apiBasePath = apiBasePath.toLowerCase();
        if (!apiBasePath.endsWith('/')) {
            apiBasePath += '/';
        }

        return this;
    }

    /*
     * Configure any API paths that return unsecured content, such as /api/unsecured
     */
    public addUnsecuredPath(unsecuredPath: string): FrameworkInitialiser<TClaims> {
        this._unsecuredPaths.push(unsecuredPath.toLowerCase());
        return this;
    }

    /*
     * Consumers of the builder class must provide a constructor function for creating claims
     */
    public withClaimsSupplier(construct: new () => TClaims): FrameworkInitialiser<TClaims> {
        this._claimsSupplier = () => new construct();
        return this;
    }

    /*
     * Consumers of the builder class can provide a constructor function for injecting custom claims
     */
    public withCustomClaimsProviderSupplier(construct: new () => ICustomClaimsProvider<TClaims>)
            : FrameworkInitialiser<TClaims> {

        this._customClaimsProvider = () => new construct();
        return this;
    }

    /*
     * Prepare the framework
     */
    public async prepare(): Promise<FrameworkInitialiser<TClaims>> {

        // Create an object to access the child container per request via the HTTP context
        this._httpContextAccessor = new HttpContextAccessor();

        // Create the unhandled exception handler for API requests
        this._exceptionHandler = new UnhandledExceptionHandler(
            this._configuration,
            this._httpContextAccessor,
            this._loggerFactory);

        // Create an object to handle unpromised rejection exceptions in Express middleware
        this._unhandledPromiseRejectionHandler = new UnhandledPromiseRejectionHandler(this._exceptionHandler);

        // Load OAuth metadata
        this._issuerMetadata = new IssuerMetadata(this._configuration);
        await this._issuerMetadata.load();

        // Create the cache used to store claims results after authentication processing
        // Use a constructor function as the first parameter, as required by TypeScript generics
        this._claimsCache = ClaimsCache.createInstance<ClaimsCache<TClaims>>(
            ClaimsCache,
            this._configuration,
            this._loggerFactory);

        return this;
    }

    /*
     * Set up Express middleware and register framework dependencies
     */
    public configureMiddleware(expressApp: Application): FrameworkInitialiser<TClaims> {

        // The first middleware starts structured logging of API requests
        const logger = new LoggerMiddleware(this._httpContextAccessor, this._loggerFactory);
        expressApp.use(
            `${this._apiBasePath}*`,
            this._unhandledPromiseRejectionHandler.apply(logger.logRequest));

        // The second middleware manages authentication and claims
        const filter = new AuthenticationFilter<TClaims>(
            this._unsecuredPaths,
            this._httpContextAccessor,
            this._claimsSupplier,
            this._customClaimsProvider);
        expressApp.use(
            `${this._apiBasePath}*`,
            this._unhandledPromiseRejectionHandler.apply(filter.authorizeAndGetClaims));

        // A middleware with special behaviour for testing
        const handler = new CustomHeaderMiddleware(this._configuration.apiName);
        expressApp.use(
            `${this._apiBasePath}*`,
            this._unhandledPromiseRejectionHandler.apply(handler.processHeaders));

        // Inversify express utils requires us to register framework dependencies at this stage
        // This enables dependency graphs used by controllers to be resolved
        this._registerDependencies();
        return this;
    }

    /*
     * Express error middleware is configured last, to catch unhandled exceptions
     */
    public configureExceptionHandler(expressApp: Application): FrameworkInitialiser<TClaims> {

        expressApp.use(`${this._apiBasePath}*`, this._exceptionHandler.handleException);
        return this;
    }

    /*
     * Register dependencies when authentication is configured
     */
    private _registerDependencies(): void {

        // Register singletons for logging
        this._container.bind<FrameworkConfiguration>(FRAMEWORKTYPES.Configuration)
                       .toConstantValue(this._configuration);
        this._container.bind<ILoggerFactory>(FRAMEWORKTYPES.LoggerFactory)
                        .toConstantValue(this._loggerFactory);

        // Register singletons for security
        this._container.bind<IssuerMetadata>(FRAMEWORKTYPES.IssuerMetadata)
                       .toConstantValue(this._issuerMetadata);
        this._container.bind<ClaimsCache<TClaims>>(FRAMEWORKTYPES.ClaimsCache)
                       .toConstantValue(this._claimsCache);

        // Per request objects used for authentication
        this._container.bind<ClaimsMiddleware<TClaims>>(FRAMEWORKTYPES.ClaimsMiddleware)
                       .to(ClaimsMiddleware).inRequestScope();
        this._container.bind<Authenticator>(FRAMEWORKTYPES.Authenticator)
                       .to(Authenticator).inRequestScope();

        // Register per request framework objects which can be injected into business logic
        // The API claims is a dummy binding that is overwritten later by the authentication filter
        this._container.bind<LogEntry>(FRAMEWORKTYPES.LogEntry)
                       .toDynamicValue((ctx) => this._loggerFactory.createLogEntry()).inRequestScope();
        this._container.bind<TClaims>(FRAMEWORKTYPES.ApiClaims)
                       .toConstantValue({} as any);
    }
}
