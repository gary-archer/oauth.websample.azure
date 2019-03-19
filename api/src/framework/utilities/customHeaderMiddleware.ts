import {NextFunction, Request, Response} from 'express';

/*
 * A class to process custom headers to enable testers to control non functional behaviour
 */
export class CustomHeaderMiddleware {

    private readonly _apiName: string;

    /*
     * Receive dependencies
     */
    public constructor(apiName: string) {
        this._apiName = apiName.toLowerCase();
        this._setupCallbacks();
    }

    /*
     * Enable testers to select an API to break as part of non functional testing, to verify supportability behaviour
     * This can be especially useful when there are many APIs and they call each other
     */
    public processHeaders(request: Request, response: Response, next: NextFunction): void {

        const failApi = request.header('x-mycompany-fail-api');
        if (failApi) {
            if (failApi.toLowerCase() === this._apiName) {
                throw new Error('Simulating a production exception due to a custom header');
            }
        }

        next();
    }

    /*
     * Plumbing to ensure the this parameter is available
     */
    private _setupCallbacks(): void {
        this.processHeaders = this.processHeaders.bind(this);
    }
}
