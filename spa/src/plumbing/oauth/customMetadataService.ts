import {MetadataService, OidcClientSettingsStore, OidcMetadata} from 'oidc-client-ts';

/*
 * An override to enable the user info endpoint to be routed via an API
 */
export class CustomMetadataService extends MetadataService {

    private readonly _apiBaseUrl: string;

    public constructor(settings: OidcClientSettingsStore, apiBaseUrl: string) {
        super(settings);
        this._apiBaseUrl = apiBaseUrl;
    }

    public async getUserInfoEndpoint(): Promise<string> {
        return `${this._apiBaseUrl}/oauthuserinfo`
    }
}
