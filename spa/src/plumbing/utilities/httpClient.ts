import * as $ from 'jquery';
import {Configuration} from '../../configuration/configuration';
import {ErrorHandler} from '../errors/errorHandler';
import {Authenticator} from '../oauth/authenticator';

/*
 * Logic related to making HTTP calls
 */
export class HttpClient {

    /*
     * Download JSON data from the app config file
     */
    public static async loadAppConfiguration(filePath: string): Promise<Configuration> {

        try {
            // Make the remote call
            const data = await $.ajax({
                    url: filePath,
                    type: 'GET',
                    dataType: 'json',
                });
            return data as Configuration;

        } catch (xhr) {
            // Improve the default error message
            throw ErrorHandler.getFromAjaxError(xhr, filePath);
        }
    }

    /*
     * Azure AD does not support CORS requests to download token signing keys
     * Therefore we make a double hop via our API instead
     */
    public static async loadTokenSigningKeys(jwksUrl: string): Promise<any> {
        try {
            // Make the call
            const keyset = await $.ajax({
                    url: jwksUrl,
                    type: 'GET',
                    dataType: 'json',
                });
            return keyset.keys;

        } catch (xhr) {
            // Improve the default error message
            throw ErrorHandler.getFromAjaxError(xhr, jwksUrl);
        }
    }

    /*
     * Get data from an API URL and handle retries if needed
     */
    public static async callApi(
        url: string,
        method: string,
        dataToSend: any,
        authenticator: Authenticator): Promise<any> {

        // Get a token, which will log the user in if needed
        let token = await authenticator.getAccessToken();

        try {

            // Call the API
            return await HttpClient._callApiWithToken(url, method, dataToSend, token);

        } catch (xhr1) {

            // Report Ajax errors if this is not a 401
            if (xhr1.status !== 401) {
                throw ErrorHandler.getFromAjaxError(xhr1, url);
            }

            // If we received a 401 then clear the failing access token from storage and get a new one
            await authenticator.clearAccessToken();
            token = await authenticator.getAccessToken();

            try {
                // Call the API again
                return await HttpClient._callApiWithToken(url, method, dataToSend, token);

            } catch (xhr2) {
                // Report Ajax errors for the retry
                throw ErrorHandler.getFromAjaxError(xhr2, url);
            }
        }
    }

    /*
     * Do the work of calling the API
     */
    private static async _callApiWithToken(
        url: string,
        method: string,
        dataToSend: any,
        accessToken: string): Promise<any> {

        const dataToSendText = dataToSend ? JSON.stringify(dataToSend) : '';

        return await $.ajax({
            url,
            data: dataToSendText,
            dataType: 'json',
            contentType: 'application/json',
            type: method,
            beforeSend: (xhr) => {
                if (accessToken !== null) {
                    xhr.setRequestHeader ('Authorization', 'Bearer ' + accessToken);
                }
            },
        });
    }
}
