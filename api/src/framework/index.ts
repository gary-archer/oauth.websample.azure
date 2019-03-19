/*
 * Export framework public types but not internal classes
 */

import {FrameworkConfiguration} from './configuration/frameworkConfiguration';
import {FrameworkInitialiser} from './configuration/frameworkInitialiser';
import {FRAMEWORKTYPES} from './configuration/frameworkTypes';
import {ApiError} from './errors/apiError';
import {ClientError} from './errors/clientError';
import {ExceptionHelper} from './errors/exceptionHelper';
import {StartupExceptionHandler} from './errors/startupExceptionHandler';
import {UnhandledPromiseRejectionHandler} from './errors/unhandledPromiseRejectionHandler';
import {DefaultCustomClaimsProvider} from './extensibility/defaultCustomClaimsProvider';
import {IClientError} from './extensibility/iclientError';
import {ICustomClaimsProvider} from './extensibility/icustomClaimsProvider';
import {IDisposable} from './extensibility/idisposable';
import {ILoggerFactory} from './extensibility/iloggerFactory';
import {LogEntry} from './logging/logEntry';
import {LoggerFactory} from './logging/loggerFactory';
import {LoggerMiddleware} from './logging/loggerMiddleware';
import {PerformanceBreakdown} from './logging/performanceBreakdown';
import {AuthenticationFilter} from './security/authenticationFilter';
import {CoreApiClaims} from './security/coreApiClaims';
import {CustomPrincipal} from './security/customPrincipal';
import {CustomHeaderMiddleware} from './utilities/customHeaderMiddleware';
import {DebugProxyAgent} from './utilities/debugProxyAgent';
import {HttpContextAccessor} from './utilities/httpContextAccessor';
import {using} from './utilities/using';

export {
    FrameworkConfiguration,
    FrameworkInitialiser,
    FRAMEWORKTYPES,
    ApiError,
    ClientError,
    ExceptionHelper,
    StartupExceptionHandler,
    UnhandledPromiseRejectionHandler,
    DefaultCustomClaimsProvider,
    IClientError,
    ICustomClaimsProvider,
    IDisposable,
    ILoggerFactory,
    LogEntry,
    LoggerFactory,
    LoggerMiddleware,
    PerformanceBreakdown,
    AuthenticationFilter,
    CoreApiClaims,
    CustomPrincipal,
    CustomHeaderMiddleware,
    DebugProxyAgent,
    HttpContextAccessor,
    using,
};
