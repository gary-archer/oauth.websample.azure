import * as express from 'express';
import * as fs from 'fs-extra';
import {Configuration} from './configuration/configuration';
import {HttpServer} from './httpServer';
import {WebApi} from './logic/webApi';
import {ApiLogger} from './plumbing/apiLogger';
import {WebServer} from './webServer';

/*
 * First load configuration
 */
const apiConfigBuffer = fs.readFileSync('api.config.json');
const apiConfig = JSON.parse(apiConfigBuffer.toString()) as Configuration;

/*
 * Create the express app
 */
const expressApp = express();
ApiLogger.initialize();

/*
 * Configure the web server
 */
const webServer = new WebServer(expressApp);
webServer.configureRoutes();

/*
 * Configure the API
 */
const webApi = new WebApi(expressApp, apiConfig);
webApi.configureRoutes();

/*
 * Start listening for requests
 */
const httpServer = new HttpServer(expressApp, apiConfig);
httpServer.startListening();
