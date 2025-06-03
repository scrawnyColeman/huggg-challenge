import { ApiClient } from '../clients/api-client.interface';
import { Product } from '../types';

export class BrandService {
	private apiClient: ApiClient;

	constructor(apiClient: ApiClient) {
		this.apiClient = apiClient;
	}

	async getProductsByBrandId(brandId: string): Promise<Product[]> {
		const data = await this.apiClient.getData();

		const productsMap = new Map(data.embedded.products.map((product) => [product.id, product]));

		const brand = data.data.find((brand) => brand.id === brandId);
		if (!brand) return [];

		const allProductIds = [...brand.products, ...brand.consolidated_products];
		return allProductIds.map((id) => productsMap.get(id)).filter((product): product is NonNullable<typeof product> => product != undefined);
	}
}
