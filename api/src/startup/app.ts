import * as fs from 'fs-extra';
import {Container} from 'inversify';
import 'reflect-metadata';
import {Configuration} from '../configuration/configuration';
import {DebugProxyAgent, LoggerFactory, StartupExceptionHandler} from '../framework';
import {HttpServer} from './httpServer';

// The application entry point
(async () => {

    // Create initial objects
    const loggerFactory = new LoggerFactory();
    const container = new Container();

    try {

        // Load our JSON configuration and configure log levels
        const configurationBuffer = fs.readFileSync('api.config.json');
        const configuration = JSON.parse(configurationBuffer.toString()) as Configuration;
        loggerFactory.configure(configuration.framework);

        // Set up HTTP debugging if configured
        DebugProxyAgent.initialise();

        // Configure then start the HTTP server
        const httpServer = new HttpServer(configuration, container, loggerFactory);
        const app = await httpServer.configure();
        httpServer.start(app);

    } catch (e) {

        // Report startup errors
        const handler = new StartupExceptionHandler(loggerFactory);
        handler.handleStartupException('BasicApi', e);
    }
})();
