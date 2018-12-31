/*
 * A holder for application settings
 */
export interface AppConfiguration {
    sslCertificateFileName: string;
    sslCertificatePassword: string;
    trustedOrigins: string[];
}
