import {OidcClient, UserManager, UserManagerSettings} from 'oidc-client-ts';
import {CustomMetadataService} from './customMetadataService';

/*
 * An override to enable the OAuth user info request to be routed via our API
 * The API then performs an On Behalf Of flow before calling the Graph User Info endpoint
 */
export default class CustomUserManager extends UserManager {

    // In TypeScript you can override protected readonly members in derived classes
    protected readonly _client: OidcClient;

    public constructor(settings: UserManagerSettings, apiBaseUrl: string) {

        super(settings);
        const metadataService = new CustomMetadataService(this.settings, apiBaseUrl)
        this._client = new OidcClient(this.settings, metadataService);
    }
}
