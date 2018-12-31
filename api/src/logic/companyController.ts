import {Request, Response} from 'express';
import {ApiLogger} from '../plumbing/apiLogger';
import {ResponseWriter} from '../plumbing/responseWriter';
import {CompanyRepository} from './companyRepository';

/*
 * Our API controller runs after claims handling has completed and we can use claims for authorization
 */
export class CompanyController {

    /*
     * The repository is injected
     */
    private _repository: CompanyRepository;

    /*
     * Receive dependencies
     */
    public constructor(repository: CompanyRepository) {
        this._repository = repository;
    }

    /*
     * Return the list of companies
     */
    public async getCompanyList(request: Request, response: Response): Promise<void> {

        ApiLogger.info('CompanyController', 'Returning company list');

        // Get data as entities
        const companies = await this._repository.getCompanyList();
        ResponseWriter.writeObject(response, 200, companies);
    }

    /*
     * Return the transaction details for a company
     */
    public async getCompanyTransactions(request: Request, response: Response): Promise<void> {

        const id = parseInt(request.params.id, 10);
        ApiLogger.info('API call', `Request for transaction details for company: ${id}`);

        // Get data as entities and handle not found items
        const transactions = await this._repository.getCompanyTransactions(id);
        ResponseWriter.writeObject(response, 200, transactions);
    }
}
