import Data from './__data.json';
import { ApiClient } from './api-client.interface';

/** Simulates a third party API call */
export class ApiClientImpl implements ApiClient {
	async getData() {
		return Promise.resolve(Data);
	}
}
