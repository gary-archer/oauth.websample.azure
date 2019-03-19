import {Logger} from 'winston';
import {LogEntry} from '../logging/logEntry';

/*
 * An interface for creating logging objects
 */
export interface ILoggerFactory {

    // Configure logging behaviour
    configure(logConfiguraton: any): void;

    // Get the production logger, which outputs structured data
    getProductionLogger(): Logger;

    // Create a text logger for startup messages
    createStartupLogger(name: string): Logger;

    // Create a debug text logger for a developer PC
    createDevelopmentLogger(className: string): Logger;

    // Use the logging configuration to create a log entry
    createLogEntry(): LogEntry;
}
