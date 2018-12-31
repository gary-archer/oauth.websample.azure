import * as hasher from 'js-sha256';
import * as NodeCache from 'node-cache';
import {ApiClaims} from '../entities/apiClaims';
import {ApiLogger} from './apiLogger';

/*
 * A simple in memory claims cache for our API
 */
export class ClaimsCache {

    /*
     * Add claims to the cache until the token's time to live
     */
    public static addClaimsForToken(accessToken: string, expiry: number, claims: ApiClaims): void {

        // Use the exp field returned from introspection to work out the token expiry time
        const epochSeconds = Math.floor((new Date() as any) / 1000);
        const secondsToCache = expiry - epochSeconds;
        if (secondsToCache > 0) {

            // Cache the token until it expires
            ApiLogger.info('ClaimsCache', `Caching received token for ${secondsToCache} seconds`);
            const hash = hasher.sha256(accessToken);
            ClaimsCache._cache.set(hash, JSON.stringify(claims), secondsToCache * 1000);
        }
    }

    /*
     * Get claims from the cache or return null if not found
     */
    public static getClaimsForToken(accessToken: string): ApiClaims | null {

        const hash = hasher.sha256(accessToken);
        const claims = ClaimsCache._cache.get<string>(hash);
        if (!claims) {

            // We need to introspect the new token
            ApiLogger.info('ClaimsCache', `No existing token found for hash ${hash}`);
            return null;
        } else {

            // We can efficiently return existing claims
            ApiLogger.info('ClaimsCache', `Found existing token for hash ${hash}`);
            return JSON.parse(claims!);
        }
    }

    private static _cache = new NodeCache();
}
