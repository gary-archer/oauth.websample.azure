import {Request} from 'express';
import {interfaces} from 'inversify-express-utils';

/*
 * Inversify express creates a container per request and stores it in an HTTP context
 * This helper makes the context available
 */
export class HttpContextAccessor {

    /*
     * Currently the only way to get the context is to use the below internal string
     */
    public getHttpContext(request: Request): interfaces.HttpContext {
        const context = Reflect.getMetadata('inversify-express-utils:httpcontext', request);
        return context as interfaces.HttpContext;
    }
}
