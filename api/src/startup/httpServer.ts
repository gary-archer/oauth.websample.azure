import * as cors from 'cors';
import {Application, Request, Response} from 'express';
import * as fs from 'fs';
import * as https from 'https';
import {Container} from 'inversify';
import {InversifyExpressServer, TYPE} from 'inversify-express-utils';
import * as path from 'path';
import * as url from 'url';
import {Configuration} from '../configuration/configuration';
import {FrameworkInitialiser, ILoggerFactory} from '../framework';
import {BasicApiClaimsProvider} from '../logic/authorization/basicApiClaimsProvider';
import {BasicApiClaims} from '../logic/entities/basicApiClaims';

/*
 * The relative path to web files
 */
const WEB_FILES_ROOT = '../../..';

/*
 * Configure HTTP behaviour at application startup
 */
export class HttpServer {

    /*
     * Our dependencies
     */
    private readonly _configuration: Configuration;
    private readonly _container: Container;
    private readonly _loggerFactory: ILoggerFactory;

    /*
     * Receive the configuration and the container
     */
    public constructor(apiConfig: Configuration, container: Container, loggerFactory: ILoggerFactory) {
        this._configuration = apiConfig;
        this._container = container;
        this._loggerFactory = loggerFactory;
    }

    /*
     * Configure then start listening for requests
     */
    public async start(): Promise<void> {

        // Do the startup configuration
        const expressApp = await this._configure();

        // Use the web URL to determine the port
        const webUrl = url.parse(this._configuration.api.trustedOrigins[0]);

        // Calculate the port from the URL
        let port = 443;
        if (webUrl.port) {
            port = Number(webUrl.port);
        }

        // Node does not support certificate stores so we need to load a certificate file from disk
        const sslOptions = {
            pfx: fs.readFileSync(`certs/${this._configuration.api.sslCertificateFileName}`),
            passphrase: this._configuration.api.sslCertificatePassword,
        };

        // Start listening on HTTPS
        const httpsServer = https.createServer(sslOptions, expressApp);
        httpsServer.listen(port, () => {

            // Show a startup message
            const logger = this._loggerFactory.createStartupLogger('HTTP Server');
            logger.info(`Listening on HTTPS port ${port}`);
        });
    }

    /*
     * Configure behaviour before starting the server
     */
    private async _configure(): Promise<Application> {

        // Create the server, which will use registered @controller attributes to set up Express routes
        // Note that we do not use the final parameter as an auth provider due to dependency injection limitations
        const server = new InversifyExpressServer(
            this._container,
            null,
            {rootPath: '/api'},
            null,
            null);

        // Prepare the framework, and we must provide supplier functions to work around type erasure
        const framework = new FrameworkInitialiser<BasicApiClaims>(
            this._container,
            this._configuration.framework,
            this._loggerFactory);
        await framework.withApiBasePath('/api/')
                       .withClaimsSupplier(BasicApiClaims)
                       .withCustomClaimsProviderSupplier(BasicApiClaimsProvider)
                       .prepare();

        // Configure middleware
        server.setConfig((expressApp: Application) => {

            // Our API requests are not designed for caching
            expressApp.set('etag', false);

            // Allow cross origin requests from the SPA
            const corsOptions = { origin: this._configuration.api.trustedOrigins };
            expressApp.use('/api/*', cors(corsOptions));

            // Configure how web static content is served
            this._configureWebStaticContent(expressApp);

            // Configure framework cross cutting concerns for security and logging
            framework.configureMiddleware(expressApp);
        });

        // Configure framework error handling last
        server.setErrorConfig((expressApp: Application) => {
            framework.configureExceptionHandler(expressApp);
        });

        // Build and return the express app
        return server.build();
    }

    /*
     * Handle requests for static web content
     */
    private _configureWebStaticContent(expressApp: Application): void {

        expressApp.get('/spa/*', this._getWebResource);
        expressApp.get('/spa', this._getWebRootResource);
        expressApp.get('/favicon.ico', this._getFavicon);
    }

    /*
     * Serve up the requested web file
     */
    private _getWebResource(request: Request, response: Response): void {

        let resourcePath = request.path.replace('spa/', '');
        if (resourcePath === '/') {
           resourcePath = 'index.html';
        }

        const webFilePath = path.join(`${__dirname}/${WEB_FILES_ROOT}/spa/${resourcePath}`);
        response.sendFile(webFilePath);
    }

    /*
     * Serve up the requested web file
     */
    private _getWebRootResource(request: Request, response: Response): void {

        const webFilePath = path.join(`${__dirname}/${WEB_FILES_ROOT}/spa/index.html`);
        response.sendFile(webFilePath);
    }

    /*
     * Serve up our favicon
     */
    private _getFavicon(request: Request, response: Response): void {

        const webFilePath = path.join(`${__dirname}/${WEB_FILES_ROOT}/spa/favicon.ico`);
        response.sendFile(webFilePath);
    }
}
