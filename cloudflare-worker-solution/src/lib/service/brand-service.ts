import { ApiClient } from '@/lib/clients/api-client.interface';
import type { ProductDto } from '@/lib/dtos/product';

export class BrandService {
	private apiClient: ApiClient;

	constructor(apiClient: ApiClient) {
		this.apiClient = apiClient;
	}

	async getProductsByBrandId(brandId: string): Promise<ProductDto[]> {
		const data = await this.apiClient.getData();

		const brand = data.data.find((brand) => brand.id === brandId);
		if (!brand) throw new Error('Brand not found');

		const productsMap = new Map(data.embedded.products.map((product) => [product.id, product]));

		const allProductIds = [...brand.products, ...brand.consolidated_products];
		return allProductIds.map((id) => productsMap.get(id)).filter((product): product is ProductDto => product != undefined);
	}
}
