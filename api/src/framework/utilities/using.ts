import {IDisposable} from '../extensibility/idisposable';

/*
 * A helper function similar to the .Net concept
 */
export async function using<T extends IDisposable>(resource: T, func: () => any) {
    try {
        return await func();
    } finally {
        resource.dispose();
    }
}
