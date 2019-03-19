import {NextFunction, Request, Response} from 'express';
import {UnhandledExceptionHandler} from './unhandledExceptionHandler';

/*
 * Deal with Express unhandled promise exceptions during async operations
 * https://medium.com/@Abazhenov/using-async-await-in-express-with-node-8-b8af872c0016
 */
export class UnhandledPromiseRejectionHandler {

    private readonly _handler: UnhandledExceptionHandler;

    public constructor(handler: UnhandledExceptionHandler) {
        this._handler = handler;
    }

    /*
     * Wrap the function in a promise and pass unresolved promise exceptions to our exception handler
     */
    public apply(fn: any): any {

        return (request: Request, response: Response, next: NextFunction) => {

            Promise
                .resolve(fn(request, response, next))
                .catch((e) => {
                    this._handler.handleException(e, request, response, next);
                });
        };
    }
}
