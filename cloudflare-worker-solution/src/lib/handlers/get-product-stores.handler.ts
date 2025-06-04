import { DataOf, OpenAPIRoute, Path } from '@cloudflare/itty-router-openapi';
import { z } from 'zod';
import { ProductService } from '@/lib/service/product-service';
import { SomeThirdPartyApiClientImpl } from '@/lib/clients/some-third-party-api-client';
import { StoreDto } from '@/lib/dtos/store';

export class GetProductStores extends OpenAPIRoute {
	async handle(request: Request, env: Env, context: { executionContext: ExecutionContext }, data: DataOf<typeof GetProductStores.schema>) {
		const apiClient = new SomeThirdPartyApiClientImpl();

		const productService = new ProductService(apiClient);
		const stores = await productService.getStoresByProductId(data.params.productId);

		return new Response(JSON.stringify({ stores, count: stores.length }), { status: 200 });
	}

	static schema = {
		summary: 'Get stores of a product',
		parameters: {
			productId: Path(z.string(), { required: true }),
		},
		responses: {
			'200': {
				description: 'List of stores where the product is available',
				schema: z.object({
					stores: z.array(StoreDto),
					count: z.number(),
				}),
			},
			'404': {
				description: 'Product not found',
				schema: z.object({ error: z.string() }),
			},
		},
	};
}
