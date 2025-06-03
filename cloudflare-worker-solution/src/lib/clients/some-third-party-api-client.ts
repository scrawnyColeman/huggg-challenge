import Data from './__data.json';
import { ApiClient } from './api-client.interface';

export class SomeThirdPartyApiClientImpl implements ApiClient {
	async getData() {
		return Promise.resolve(Data);
	}
}
