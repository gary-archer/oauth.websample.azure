import {ApiClaims} from '../entities/apiClaims';
import {Company} from '../entities/company';
import {CompanyTransactions} from '../entities/companyTransactions';
import {ClientError} from '../plumbing/clientError';
import {JsonReader} from '../plumbing/jsonReader';

/*
 * A simple API controller for getting data about a company and its investments
 */
export class CompanyRepository {

    /*
     * Every API request receives our complex claims which are only calculated when the token is first received
     */
    private _claims: ApiClaims;
    private _jsonReader: JsonReader;

    /*
     * Receive claims when constructed
     */
    public constructor(claims: ApiClaims, jsonReader: JsonReader) {
        this._claims = claims;
        this._jsonReader = jsonReader;
    }

    /*
     * Return the list of companies from a hard coded data file
     */
    public async getCompanyList(): Promise<Company[]> {

        // Read data from a JSON file into objects
        const companies = await this._jsonReader.readData<Company[]>('data/companyList.json');

        // We will then filter on only authorized companies
        const authorizedCompanies = companies.filter((c) => this._isUserAuthorizedForCompany(c.id));
        return authorizedCompanies;
    }

    /*
     * Return transactions for a company given its id
     */
    public async getCompanyTransactions(id: number): Promise<CompanyTransactions | null> {

        // If the user is unauthorized we return 404
        if (!this._isUserAuthorizedForCompany(id)) {
            throw new ClientError(404, 'DataAccess', `Transactions for company ${id} were not found for this user`);
        }

        // Read companies and find that supplied
        const companyList = await this._jsonReader.readData<Company[]>('data/companyList.json');
        const foundCompany = companyList.find((c) => c.id === id);
        if (foundCompany) {

            // Next read transactions from the database
            const companyTransactions =
                await this._jsonReader.readData<CompanyTransactions[]>('data/companyTransactions.json');

            // Then join the data
            const foundTransactions = companyTransactions.find((ct) => ct.id === id);
            if (foundTransactions) {
                foundTransactions.company = foundCompany;
                return foundTransactions;
            }
        }

        // If the data is not found we also return 404
        throw new ClientError(404, 'DataAccess', `Transactions for company ${id} were not found for this user`);
    }

    /*
     * Apply claims that were read when the access token was first validated
     */
    private _isUserAuthorizedForCompany(companyId: number): boolean {
        const found = this._claims.userCompanyIds.find((c) => c === companyId);
        return !!found;
    }
}
