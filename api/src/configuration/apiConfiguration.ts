/*
 * A holder for API configuration settings
 */
export interface ApiConfiguration {
    trustedOrigins: string[];
    sslCertificateFileName: string;
    sslCertificatePassword: string;
}
