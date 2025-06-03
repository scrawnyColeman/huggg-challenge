import { OpenAPIRouter } from '@cloudflare/itty-router-openapi';
import { GetBrandProducts } from './handlers/get-brand-products.handler';
import { GetProductStores } from './handlers/get-product-stores.handler';

export const V1_ROUTER_PATH = '/v1/api';

export const v1Router = OpenAPIRouter({ base: V1_ROUTER_PATH });
v1Router.get('/brands/:brandId/products', GetBrandProducts);
v1Router.get('/products/:productId/stores', GetProductStores);
