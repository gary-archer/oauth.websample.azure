import {Response} from 'express';

/*
 * Helper methods to write the response
 */
export class ResponseWriter {

    /*
     * Return data to the caller, which could be a success or error object
     */
    public static writeObject(response: Response, statusCode: number, data: any) {
        response.setHeader('Content-Type', 'application/json');
        response.status(statusCode).send(JSON.stringify(data));
    }

    /*
     * Return an invalid token response to the caller
     */
    public static writeInvalidTokenResponse(response: Response): void {
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('WWW-Authenticate', 'Bearer');

        const data = {
            area: 'Authentication',
            message: 'Missing, invalid or expired access token',
        };
        response.status(401).send(JSON.stringify(data));
    }
}
