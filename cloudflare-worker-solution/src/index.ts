import { OpenAPIRouter } from '@cloudflare/itty-router-openapi';
import { v1Router } from './lib/router';
import { V1_ROUTER_PATH } from './lib/router';
import { preflight, corsify } from './middlewares/cors';

export const router = OpenAPIRouter({
	schema: { info: { title: 'huggg-challenge API', version: '1.0' } },
	docs_url: '/docs',
});

router.all('*', preflight);
router.all(`${V1_ROUTER_PATH}/*`, v1Router);
router.all('*', () => new Response('Not Found.', { status: 404 }));

export type Ctx = { executionContext: ExecutionContext };

export default {
	fetch: async (request: Request, env: Env, executionContext: ExecutionContext) => {
		return corsify(await router.handle(request, env, { executionContext }));
	},
};
