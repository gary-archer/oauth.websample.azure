import {Application} from 'express';
import * as fs from 'fs';
import * as https from 'https';
import * as url from 'url';
import {Configuration} from './configuration/configuration';
import {ApiLogger} from './plumbing/apiLogger';

/*
 * HTTP listening setup
 */
export class HttpServer {

    /*
     * Fields
     */
    private _expressApp: Application;
    private _apiConfig: any;

    /*
     * Class setup
     */
    public constructor(expressApp: Application, apiConfig: any) {
        this._expressApp = expressApp;
        this._apiConfig = apiConfig;
    }

    /*
     * Start listening
     */
    public startListening(): void {

        // Use the web URL to determine the port
        const webUrl = url.parse(this._apiConfig.app.trustedOrigins[0]);

        // Calculate the port from the URL
        let port = 443;
        if (webUrl.port) {
            port = Number(webUrl.port);
        }

        // Node does not support certificate stores so we need to load a certificate file from disk
        const sslOptions = {
            pfx: fs.readFileSync(`certs/${this._apiConfig.app.sslCertificateFileName}`),
            passphrase: this._apiConfig.app.sslCertificatePassword,
        };

        // Start listening on HTTPS
        const httpsServer = https.createServer(sslOptions, this._expressApp);
        httpsServer.listen(port, () => {
            ApiLogger.info(`Server is listening on HTTPS port ${port}`);
        });
    }
}
