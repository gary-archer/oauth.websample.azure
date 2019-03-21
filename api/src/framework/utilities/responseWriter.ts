import {Response} from 'express';
import {ClientError} from '../errors/clientError';

/*
 * Helper methods to write the response
 */
export class ResponseWriter {

    /*
     * Return data to the caller, which could be a success or error object
     */
    public writeObjectResponse(response: Response, statusCode: number, data: any) {

        // Write headers
        response.setHeader('Content-Type', 'application/json');

        // Write the response data
        response.status(statusCode).send(JSON.stringify(data));
    }

    /*
     * Return a 401 response specially
     */
    public writeInvalidTokenResponse(response: Response, error: ClientError) {

        // Write standard headers
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('WWW-Authenticate', 'Bearer');

        // Write the error data
        response.status(error.getStatusCode()).send(JSON.stringify(error.toResponseFormat()));
    }
}
