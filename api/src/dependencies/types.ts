/*
 * Business logic types used with dependency injection
 */
export const TYPES = {

    SecurityController: Symbol.for('SecurityController'),
    JsonFileReader: Symbol.for('JsonFileReader'),
    CompanyRepository: Symbol.for('CompanyRepository'),
    CompanyController: Symbol.for('CompanyController'),
    UserInfoController: Symbol.for('UserInfoController'),
};
