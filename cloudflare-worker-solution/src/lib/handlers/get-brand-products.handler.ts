import { DataOf, OpenAPIRoute, Path } from '@cloudflare/itty-router-openapi';
import { z } from 'zod';
import { Ctx } from '../../index';
import { ApiClientImpl } from '../clients/api-client.impl';
import { BrandService } from '../service/brand-service';

export class GetBrandProducts extends OpenAPIRoute {
	async handle(request: Request, env: Env, context: Ctx, data: DataOf<typeof GetBrandProducts.schema>) {
		const apiClient = new ApiClientImpl();

		const brandService = new BrandService(apiClient);
		const products = await brandService.getProductsByBrandId(data.params.brandId);

		return new Response(JSON.stringify(products), { status: 200 });
	}

	static schema = {
		summary: 'Get products of a brand',
		parameters: {
			brandId: Path(z.string(), { required: true }),
		},
		responses: {
			'200': {
				description: 'List of products of a brand',
				schema: z.array(
					z.object({
						productId: z.number(),
						productName: z.string(),
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
