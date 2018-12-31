import {Request, Response} from 'express';
import {ApiLogger} from '../plumbing/apiLogger';
import {Authenticator} from '../plumbing/authenticator';

/*
 * An API controller for downloading signing keys
 */
export class SigningKeysController {

    /*
     * Fields supplied at construction
     */
    private _authenticator: Authenticator;

    /*
     * Receive OAuth configuration
     */
    public constructor(authenticator: Authenticator) {
        this._authenticator = authenticator;
    }

    /*
     * Make an HTTPS request to get the keys then download them to the UI
     */
    public async getTokenSigningKeys(request: Request, response: Response): Promise<void> {

        ApiLogger.info('UserInfoController', 'Returning token signing keys');

        // Use the authenticator class since we are interacting with an Open Id Connect endpoint to get the keys
        const tokenSigningKeys = await this._authenticator.getTokenSigningKeys();
        response.end(JSON.stringify(tokenSigningKeys));
    }
}
