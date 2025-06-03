import { ApiClient } from '../clients/api-client.interface';
import { Store } from '../types';

export class ProductService {
	private apiClient: ApiClient;

	constructor(apiClient: ApiClient) {
		this.apiClient = apiClient;
	}

	async getStoresByProductId(productId: string): Promise<Store[]> {
		return [];
	}
}
