import * as fs from 'fs-extra';
import {injectable} from 'inversify';

/*
 * A simple utility to deal with the infrastructure of reading JSON files
 */
@injectable()
export class JsonFileReader {

    /*
     * Do the file reading and return a promise
     */
    public async readData<T>(filePath: string): Promise<T> {

        const buffer = await fs.readFile(filePath);
        return JSON.parse(buffer.toString()) as T;
    }
}
