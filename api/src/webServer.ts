import {Request, Response, Router} from 'express';
import * as path from 'path';

/*
 * The relative path to web files
 */
const WEB_FILES_ROOT = '../..';

/*
 * A primitive web server for our simple web content
 */
export class WebServer {

    /*
     * Fields
     */
    private _expressApp: Router;

    /*
     * Class setup
     */
    public constructor(expressApp: Router) {
        this._expressApp = expressApp;
    }

    /*
     * Set up Web API listening
     */
    public configureRoutes(): void {

        this._expressApp.get('/spa/*', this._getWebResource);
        this._expressApp.get('/spa', this._getWebRootResource);
        this._expressApp.get('/favicon.ico', this._getFavicon);
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
