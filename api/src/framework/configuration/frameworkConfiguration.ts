/*
 * Framework configuration settings
 */
export interface FrameworkConfiguration {
    apiName: string;
    authority: string;
    audience: string;
    maxTokenCacheMinutes: number;
    logging: any;
}
