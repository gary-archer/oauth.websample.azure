/*
 * Used for dependency injection of framework types
 */
export const FRAMEWORKTYPES = {

    // The framework manages its own configuration
    Configuration: Symbol.for('Configuration'),

    // The framework manages logging objects
    LoggerFactory: Symbol.for('LoggerFactory'),
    LogEntry: Symbol.for('LogEntry'),

    // The framework manages OAuth security
    IssuerMetadata: Symbol.for('IssuerMetadata'),
    ClaimsMiddleware: Symbol.for('ClaimsMiddleware'),
    ClaimsCache: Symbol.for('ClaimsCache'),
    Authenticator: Symbol.for('Authenticator'),
    ApiClaims: Symbol.for('ApiClaims'),
};
