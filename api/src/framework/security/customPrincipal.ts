import {interfaces} from 'inversify-express-utils';

/*
 * Implement the inversify express interface for a custom principal
 */
export class CustomPrincipal implements interfaces.Principal {

    public readonly details: any;

    public constructor(details: any) {
        this.details = details;
    }

    public isAuthenticated(): Promise<boolean> {
        return Promise.resolve(true);
    }
    public isResourceOwner(resourceId: any): Promise<boolean> {
        return Promise.resolve(false);
    }
    public isInRole(role: string): Promise<boolean> {
        return Promise.resolve(false);
    }
}
