import { OpenAPIRouter } from '@cloudflare/itty-router-openapi';
import { v1Router } from './lib/router';
import { V1_ROUTER_PATH } from './lib/router';
import { preflight, corsify } from './middlewares/cors';
import { handleErrors } from './middlewares/handle-errors';
import { NotFoundError } from './lib/errors/not-found-error';

export const router = OpenAPIRouter({
	schema: { info: { title: 'huggg-challenge API', version: '1.0' } },
	docs_url: '/docs',
})
	.all('*', preflight)
	.all(`${V1_ROUTER_PATH}/*`, v1Router)
	.all('*', () => new NotFoundError('Route not found'));

export type Ctx = { executionContext: ExecutionContext };

export default {
	fetch: async (request: Request, env: Env, executionContext: ExecutionContext) => {
		const response = await handleErrors(async () => await router.handle(request, env, { executionContext }));
		return corsify(response);
	},
} satisfies ExportedHandler<Env>;
