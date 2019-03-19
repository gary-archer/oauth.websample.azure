/*
 * Framework configuration settings
 */
export interface FrameworkConfiguration {
    apiName: string;
    authority: string;
    clientId: string;
    clientSecret: string;
    maxTokenCacheMinutes: number;
    logging: any;
}
