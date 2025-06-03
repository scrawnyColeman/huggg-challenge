import { DataOf, OpenAPIRoute, Path } from '@cloudflare/itty-router-openapi';
import { z } from 'zod';
import { SomeThirdPartyApiClientImpl } from '@/lib/clients/some-third-party-api-client';
import { BrandService } from '@/lib/service/brand-service';
import { ProductDto } from '@/lib/dtos/product';

export class GetBrandProducts extends OpenAPIRoute {
	async handle(request: Request, env: Env, context: { executionContext: ExecutionContext }, data: DataOf<typeof GetBrandProducts.schema>) {
		const apiClient = new SomeThirdPartyApiClientImpl();

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
				schema: z.array(ProductDto),
			},
			'404': {
				description: 'Brand not found',
				schema: z.object({ error: z.string() }),
			},
		},
	};
}
