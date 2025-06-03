import { DataOf, OpenAPIRoute, Path } from '@cloudflare/itty-router-openapi';
import { z } from 'zod';
import { Ctx } from '../../index';
import { ProductService } from '../service/product-service';
import { ApiClientImpl } from '../clients/api-client.impl';

export class GetProductStores extends OpenAPIRoute {
	async handle(request: Request, env: Env, context: Ctx, data: DataOf<typeof GetProductStores.schema>) {
		const apiClient = new ApiClientImpl();

		const productService = new ProductService(apiClient);
		const stores = await productService.getStoresByProductId(data.params.productId);

		return new Response(JSON.stringify(stores), { status: 200 });
	}

	static schema = {
		summary: 'Get stores of a product',
		parameters: {
			productId: Path(z.string(), { required: true }),
		},
		responses: {
			'200': {
				description: 'List of stores where the product is available',
				schema: z.array(
					z.object({
						storeId: z.number(),
						storeName: z.string(),
					})
				),
			},
			'404': {
				description: 'Product not found',
				schema: z.object({
					error: z.string(),
				}),
			},
		},
	};
}
