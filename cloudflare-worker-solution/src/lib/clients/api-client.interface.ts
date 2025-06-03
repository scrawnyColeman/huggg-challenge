import Data from './__data.json';

export interface ApiClient {
	getData: () => Promise<typeof Data>;
}
