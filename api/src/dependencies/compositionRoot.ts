import {Container} from 'inversify';
import {CompanyController} from '../logic/controllers/companyController';
import {UserInfoController} from '../logic/controllers/userInfoController';
import {CompanyRepository} from '../logic/repositories/companyRepository';
import {JsonFileReader} from '../utilities/jsonFileReader';
import {TYPES} from './types';

/*
 * Compose the application's business dependencies
 */
export class CompositionRoot {

    /*
     * Regster business objects as per request dependencies, recreated for each API request
     */
    public static registerDependencies(container: Container): void {

        // Note also that Inversify creates an instance of each object at application startup
        // This is done to create the dependency graph definition
        container.bind<JsonFileReader>(TYPES.JsonFileReader).to(JsonFileReader).inRequestScope();
        container.bind<CompanyRepository>(TYPES.CompanyRepository).to(CompanyRepository).inRequestScope();
        container.bind<CompanyController>(TYPES.CompanyController).to(CompanyController).inRequestScope();
        container.bind<UserInfoController>(TYPES.UserInfoController).to(UserInfoController).inRequestScope();
    }
}
