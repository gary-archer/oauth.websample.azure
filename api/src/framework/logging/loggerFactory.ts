import * as winston from 'winston';
import {FrameworkConfiguration} from '../configuration/frameworkConfiguration';
import {ILoggerFactory} from '../extensibility/iloggerFactory';
import {LogEntry} from './logEntry';
import {LogLevel} from './logLevel';

/*
 * A default logging implementation
 */
export class LoggerFactory implements ILoggerFactory {

    // The API name
    private _apiName: string;

    // Levels and thresholds
    private _productionLevel: string;
    private _developmentLevel: string;
    private _classOverrideLevels: LogLevel[];
    private _defaultPerformanceThresholdMilliseconds: number;

    // The production logger
    private _productionLogger!: winston.Logger;

    /*
     * Set defaults
     */
    public constructor() {

        this._apiName = '';

        // Set default log levels
        this._productionLevel = 'info';
        this._developmentLevel = 'info';
        this._classOverrideLevels = [];

        // Set default performance thresholds
        this._defaultPerformanceThresholdMilliseconds = 1000;

        // Create the production logger with the default log level
        this._productionLogger = this._createProductionLogger();
    }

    /*
     * Configure at application startup from a dynamic object similar to that used in .Net Core
     */
    public configure(configuration: FrameworkConfiguration): void {

        // Initialise behaviour
        this._apiName = configuration.apiName;
        this._setLogLevels(configuration.logging.levels);
        this._setPerformanceThresholds(configuration.logging.performance);

        // Now that we've initialised correctly, recreate the production logger with the correct log level
        this._productionLogger = this._createProductionLogger();
    }

    /*
     * Create a production logger that logs every request as a JSON object
     */
    public getProductionLogger(): winston.Logger {
        return this._productionLogger;
    }

    /*
     * Create an info level text logger
     */
    public createStartupLogger(name: string): winston.Logger {
        return this._createTextLogger(name, 'info');
    }

    /*
     * Create a logger for debug messages which are only output on a developer PC
     */
    public createDevelopmentLogger(className: string): winston.Logger {

        // Get the configured level for this logger
        let level = this._developmentLevel;
        const found = this._classOverrideLevels.find((l) => l.name.toLowerCase() === className.toLowerCase());
        if (found) {
            level = found.level;
        }

        return this._createTextLogger(className, level);
    }

    /*
     * Use the logging configuration to create a log entry
     */
    public createLogEntry(): LogEntry {
        return new LogEntry(this._apiName, this._defaultPerformanceThresholdMilliseconds);
    }

    /*
     * Initialise after configuration has been read
     */
    private _setLogLevels(logLevels: any) {

        // Initialise colours
        winston.addColors({
            error: 'red',
            info: 'white',
            warn: 'yellow',
        });

        // Set default levels
        if (logLevels.production) {
            this._productionLevel = logLevels.production;
        }
        if (logLevels.development) {
            this._developmentLevel = logLevels.development;
        }

        // Support overrides to enable logging per class
        if (logLevels.classOverrides) {
            for (const name in logLevels.classOverrides) {
                if (name) {
                    const level = logLevels.classOverrides[name];
                    const logger = {
                        name,
                        level,
                    };

                    this._classOverrideLevels.push(logger);
                }
            }
        }
    }

    /*
     * We will use a single performance threshold though we could configure operation specific values if required
     */
    private _setPerformanceThresholds(performance: any) {

        if (performance.thresholdMilliseconds) {
            this._defaultPerformanceThresholdMilliseconds = performance.thresholdMilliseconds;
        }
    }

    /*
     * Create a production logger that logs every request as a JSON object
     */
    private _createProductionLogger(): winston.Logger {

        // Print a bare JSON object with a property per line
        const jsonFormatter = winston.format.printf((logEntry: any) => {
            return JSON.stringify(logEntry.message, null, 2);
        });

        const consoleOptions = {
            format: winston.format.combine(
                jsonFormatter,
            ),
        };

        // Logging is info level, lightweight and always on
        return winston.createLogger({
            level: this._productionLevel,
            transports: [
                new (winston.transports.Console)(consoleOptions),
            ],
        });
    }

    /*
     * Create a simple text logger
     */
    private _createTextLogger(name: string, level: string): winston.Logger {

        // Use the name as a prefix
        const consoleOptions = {
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                winston.format.printf((info) => `${info.level}: ${info.timestamp} : ${name} : ${info.message}`),
            ),
        };

        // Create the logger
        return winston.createLogger({
            level,
            transports: [
                new (winston.transports.Console)(consoleOptions),
            ],
        });
    }
}
