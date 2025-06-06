import { ApiClient } from '@/lib/clients/api-client.interface';
import type { StoreDto } from '@/lib/dtos/store';
import { NotFoundError } from '../errors/not-found-error';

export class ProductService {
	private apiClient: ApiClient;

	constructor(apiClient: ApiClient) {
		this.apiClient = apiClient;
	}

	async getStoresByProductId(productId: string): Promise<StoreDto[]> {
		const data = await this.apiClient.getData();

		const productExists = data.embedded.products.some((product) => product.id === productId);
		if (!productExists) throw new NotFoundError('Product not found');

		const storesMap = new Map(data.embedded.stores.map((store) => [store.id, store]));

		const brandsWithProduct = data.data.filter(
			(brand) => brand.products.includes(productId) || brand.consolidated_products.includes(productId)
		);

		const storeIds = new Set<string>();
		brandsWithProduct.forEach((brand) => {
			brand.stores.forEach((storeId) => storeIds.add(storeId));
		});

		return Array.from(storeIds)
			.map((id) => storesMap.get(id))
			.filter((store): store is StoreDto => store != undefined);
	}
}
