import {injectable} from 'inversify';
import * as hasher from 'js-sha256';
import * as NodeCache from 'node-cache';
import {Logger} from 'winston';
import {FrameworkConfiguration} from '../configuration/frameworkConfiguration';
import {ILoggerFactory} from '../extensibility/iloggerFactory';
import {CoreApiClaims} from './coreApiClaims';

/*
 * A simple in memory claims cache for our API
 */
@injectable()
export class ClaimsCache<TClaims extends CoreApiClaims> {

    /*
     * We need to pass in a constructor function plus arguments to create the correct generic type at runtime
     */
    public static createInstance<TClaimsCache>(
        construct: new (c: FrameworkConfiguration, lf: ILoggerFactory) => TClaimsCache,
        configuration: FrameworkConfiguration,
        loggerFactory: ILoggerFactory): TClaimsCache {

        return new construct(configuration, loggerFactory);
    }

    /*
     * Injected dependencies
     */
    private readonly _cache: NodeCache;
    private readonly _logger: Logger;

    /*
     * Create the cache at application startup
     */
    public constructor(configuration: FrameworkConfiguration, loggerFactory: ILoggerFactory) {

        // Create our logger
        this._logger = loggerFactory.createDevelopmentLogger(ClaimsCache.name);

        // Create the cache and set a maximum time to live in seconds
        const defaultExpirySeconds = configuration.maxTokenCacheMinutes * 60;
        this._cache = new NodeCache({
            stdTTL: defaultExpirySeconds,
        });

        // If required add debug output here to verify expiry occurs when expected
        this._cache.on('expired', (key: string, value: any) => {
            this._logger.debug(`Token with hash ${key} has expired and been removed from the cache`);
        });
    }

    /*
     * Get claims from the cache or return null if not found
     */
    public async getClaimsForToken(accessToken: string): Promise<TClaims | null> {

        // Get the token hash and see if it exists in the cache
        const hash = hasher.sha256(accessToken);
        this._logger.debug(`Token with hash ${hash} received, querying cache`);
        const claims = await this._cache.get<TClaims>(hash);
        if (!claims) {

            // If this is a new token and we need to do claims processing
            return null;
        }

        // Otherwise return cached claims
        return claims;
    }

    /*
     * Add claims to the cache until the token's time to live
     */
    public async addClaimsForToken(accessToken: string, expiry: number, claims: TClaims): Promise<void> {

        // Use the exp field returned from introspection to work out the token expiry time
        const epochSeconds = Math.floor((new Date() as any) / 1000);
        let secondsToCache = expiry - epochSeconds;
        if (secondsToCache > 0) {

            // Get the hash and output debug info
            const hash = hasher.sha256(accessToken);
            this._logger.debug(`Token with hash ${hash} will expire in ${secondsToCache} seconds`);

            // Do not exceed the maximum time we configured
            if (secondsToCache > this._cache.options.stdTTL!) {
                secondsToCache = this._cache.options.stdTTL!;
            }

            // Cache the token until the above time
            this._logger.debug(`Token with hash ${hash} being added to cache for ${secondsToCache} seconds`);
            await this._cache.set(hash, claims, secondsToCache);
        }
    }
}
