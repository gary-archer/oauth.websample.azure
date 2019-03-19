import * as fs from 'fs-extra';
import {Container} from 'inversify';
import 'reflect-metadata';
import {Configuration} from '../configuration/configuration';
import {CompositionRoot} from '../dependencies/compositionRoot';
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

        // Create the container and register the API's business logic dependencies
        CompositionRoot.registerDependencies(container);

        // Configure HTTP debugging if relevant
        DebugProxyAgent.initialise();

        // Do the application startup and start listening for requests
        const httpServer = new HttpServer(configuration, container, loggerFactory);
        await httpServer.start();

    } catch (e) {

        // Report startup errors
        const handler = new StartupExceptionHandler(loggerFactory);
        handler.handleStartupException('BasicApi', e);
    }
})();
