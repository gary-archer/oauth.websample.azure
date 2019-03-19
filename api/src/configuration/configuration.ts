import {FrameworkConfiguration} from '../framework';
import {ApiConfiguration} from './apiConfiguration';

/*
 * A holder for configuration settings
 */
export interface Configuration {
    api: ApiConfiguration;
    framework: FrameworkConfiguration;
}
