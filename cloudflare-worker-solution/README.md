# Huggg Challenge API

## Getting started

This project is a Cloudflare Worker that provides a REST API for the Huggg Challenge.

### How to run

Install dependencies

```bash
npm install
```

Start local dev server

```bash
npm run dev
```

Run test suite

```bash
npm run test
```

### How to deploy to your own Cloudflare account

```bash
# Deploy to development environment
npm run deploy:dev

# Deploy to production environment
npm run deploy:prod
```

## OpenAPI Docs

Available at `https://huggg-challenge-api-production.h9software.workers.dev/docs`

## Mock data assumptions

- I have assumed that the mocked data is intended to simulate a response from an external API (or a network call across microservices) that is not under my control and therefore I can't modify underlying database queries. Therefore, these transformations would need to be carried out on any paginated response.
  - This assumption is based on the fact that Huggg facilitates the dropshipping of products from external vendors. Many of these products will be pulled from external APIs (similar in most point-of-sale products)
- I can see that the data is paginated, but I have not leaned on that pagination in the challenge because when attempting to invoke the endpoints I receive a 401 Unauthorized error.
  - My understanding is that this challenge is asking me to extract data from the payload, agnostic of pagination. However, to implement pagination I could add a nullable `nextPageUrl` to the query params of the endpoints and propagate those params into the proxy service that talks to the Huggg/external API. By returning the new `nextPageUrl` if one exists on the API payload, the frontend consuming this API would be able to paginated through responses from this API, extracting all of the resources in a performant way
    - In this case, I might lift the `getData` up from the service layer such that data fetching is decoupled from data extraction and the service layer stays agnostic of pagination. It simply provides a pure function that takes `productId` (or `brandId`) and some brand data, and extracts the relevant information

## Caching

- I have not implemented any caching in this solution.
  - Cloudflare Workers are stateless and therefore do not support in-memory caching
  - If this were a real world application, I might implement endpoint caching using Cloudflare's KV store with a TTL dependent on how frequently the data changes and whether or not eventual consistency is acceptable. This would serve cached responses to the client for a given request for the duration of the TTL

## API Structure

This solution is built with Cloudflare Workers and OpenAPI.

The API is available at `https://huggg-challenge-api-production.h9software.workers.dev/docs`

### Endpoints:

**`GET /v1/api/brands/{brandId}/products` - Get products of a brand**

**Considerations:**

- [**Assumptions**]
  - Whilst the brandId on `embedded.products` is the ID of the brand that owns the product, I have assumed that this endpoint should return the products that are found in the `data[number].products` array of product IDs and not the products that exist in `embedded.products` array where `brandId=:brandId`.
  - Endpoint returns 404 Not Found if the brandId does not exist in the data array. But returns an empty array if the brand has no products.
  - I have assumed that the mocked data is intended to simulate a response from an external API that is not under our control and therefore we can't modify underlying database queries. Therefore, these transformations would need to be carried out on any paginated response.
    - As a result, I have included the `clients` folder to simulate an Interface that various integrations into external APIs would need to implement to provide consistency in the response format.
- [**Performance**]
  - Implemented a Map to provide an O(1) lookup time for the products while looping over the concatenated array of Product IDs and Consolidated Product IDs.

**`GET /v1/api/products/{productId}/stores` - Get stores of a product**

**Considerations:**

- [**Assumptions**]:
  - If the productId does not exist in the `embedded.products` array, it should return 404 Not Found. I have assumed here that the `embedded.products` array is a strong source of truth for the presence of a product as it will only be populated with products that are found in the `data[number].products` array of product IDs.
  - If a product is found in a Brand's `products` or `consolidated_products` array, it is available in all stores under that product.
  - The `brandId` on a `Product` or `Store` is not relevant to this feature.
- [**Performance**]:
  - Implemented Map to provide an O(1) lookup time for the Stores that are in `embedded.stores` array
  - Implemented Set to deduplicate the store IDs if a Store is found in multiple Brands
  - Looping over all brands that have the product and pushing all of their store IDs into the Set
  - Returning the stores from the Map

### Implementation Details

- Using Cloudflare Workers to host the API
- Using `itty-router` with OpenAPI to handle routing and provide documentation on `/docs`
- Start point for the API is `src/index.ts`
  - `src/lib/handlers` contains the handlers for the API
    - Responsible for parsing HTTP input and returning HTTP output
    - Does not contain any business logic
    - Handles Dependency Injection of API Client into the relevant Service
  - `src/lib/clients` contains the clients for the API
    - Responsible for fetching data from the "external" API
    - Contains the Interface that various integrations into external APIs would need to implement to provide consistency in the response format
  - `src/lib/service` contains the services for the API
    - Responsible for business logic
  - `src/lib/dtos` contains the DTOs for the API
    - Using `Zod` to validate the data and generate inferred types
  - `src/lib/errors` contains the errors for the API
    - Contains the custom errors for the API
      - Only NotFoundError is implemented
      - This pattern is nice as it allows for the use of `instanceof BaseError` in the `handle-errors` middleware to handle known error types and ensure that unhandled errors are surfaced to the user as something generic ("Oops, something went wrong")
      - Also allows for the use of `isUserFacing` attribute to determine if the error should be surfaced to the user or not

## Testing

### Automated Tests

Automated tests are written using `vitest` and are located in the `src/**/tests/*.(spec|test).ts` files.

I have added test coverage around the business logic in the `src/lib/service` folder. This is where the complexity lives and where the most value is added in the case of this challenge. However, if there were multiple adapters into various external APIs, it would benefit greatly from some form of functional/integration test

### Manual Tests

_I recommend installing jq for nice JSON formatting_

```bash
brew install jq
```

#### Test cases (GET /v1/api/brands/:brandId/products)

**Product: Fake Product**
**UUID: foo-bar-not-real-uuid**

```bash
# Without jq installed
# URL also can be visited in the browser
curl -X GET https://huggg-challenge-api-production.h9software.workers.dev/v1/api/brands/foo-bar-not-real-uuid/products

# With jq installed
curl -X GET https://huggg-challenge-api-production.h9software.workers.dev/v1/api/brands/foo-bar-not-real-uuid/products | jq .
```

Expected response:

```json
{
	"error": "Brand not found"
}
```

**Brand: Crosstown Doughnuts**
**UUID: a715b837-f4fc-48ba-ba0a-7f53b6dc59c5**

3 products and 1 consolidated product

```bash
# Without jq installed
# URL also can be visited in the browser
curl -X GET https://huggg-challenge-api-production.h9software.workers.dev/v1/api/brands/a715b837-f4fc-48ba-ba0a-7f53b6dc59c5/products

# With jq installed
curl -X GET https://huggg-challenge-api-production.h9software.workers.dev/v1/api/brands/a715b837-f4fc-48ba-ba0a-7f53b6dc59c5/products | jq .
```

Expected response:

```json
{
	"products": [
		{
			"id": "f5c72f41-972d-42b6-9ac5-51bad2afd01f",
			"created_at": "2019-06-03 11:16:00",
			"updated_at": "2019-06-03 12:16:00",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"description": "Any fresh handcrafted doughnut. Vegan options available.",
			"campaign": null,
			"label": "Doughnut",
			"internal_name": "",
			"integration": "",
			"price": "4.00",
			"over_18_offer": 0,
			"redemption_instructions": "Tap in the PIN for the store you're in, then hit 'Redeem Now'.",
			"image": "arb88899942ba28fbc9d8a7e02c789ec5e27166c0f.png",
			"subtitle": "London",
			"weight": 97979878,
			"recipient_description": "Swap your huggg for any doughnut.",
			"tag_group_id": "",
			"tag_id": "",
			"open_graph_image": "arfad9729c5b8efaef7fc849f0e44505b450f9cb6b.png",
			"active": 1,
			"on_app": 1,
			"on_imessage": 1,
			"handling_fee": 20,
			"sale_price": 400,
			"huggg_tag": "",
			"vat_voucher_type": "SPV",
			"vat": null,
			"brand_name": "Crosstown Doughnuts",
			"brand_weight": 1060,
			"image_url": "https://test.huggg.me/offers/arb88899942ba28fbc9d8a7e02c789ec5e27166c0f.png",
			"claim_image": "arb88899942ba28fbc9d8a7e02c789ec5e27166c0f.png",
			"claim_image_url": "https://test.huggg.me/offers/arb88899942ba28fbc9d8a7e02c789ec5e27166c0f.png",
			"imessage_image": "arb88899942ba28fbc9d8a7e02c789ec5e27166c0f.png",
			"imessage_image_url": "https://test.huggg.me/offers/arb88899942ba28fbc9d8a7e02c789ec5e27166c0f.png",
			"open_graph_image_url": "https://test.huggg.me/offers/arfad9729c5b8efaef7fc849f0e44505b450f9cb6b.png"
		},
		{
			"id": "57186a73-7857-4684-bf82-b2bc7b8a1040",
			"created_at": "2019-06-03 11:16:00",
			"updated_at": "2019-06-03 12:16:00",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"description": "Any 6 doughnuts.",
			"campaign": null,
			"label": "6-Pack Doughnut",
			"internal_name": "",
			"integration": "",
			"price": "21.00",
			"over_18_offer": 0,
			"redemption_instructions": "Tap in the PIN for the store you're in, then hit 'Redeem Now'.",
			"image": "ar0f27404f6557f8a7ac62ec289d689a0654af1879.png",
			"subtitle": "London",
			"weight": 89490391,
			"recipient_description": "Swap your huggg for any 6 doughnuts.",
			"tag_group_id": "",
			"tag_id": "",
			"open_graph_image": "ar8097cecde4194ef95c5489c54a08ccdf837fc0a0.png",
			"active": 1,
			"on_app": 1,
			"on_imessage": 1,
			"handling_fee": 20,
			"sale_price": 2100,
			"huggg_tag": null,
			"vat_voucher_type": "SPV",
			"vat": null,
			"brand_name": "Crosstown Doughnuts",
			"brand_weight": 1060,
			"image_url": "https://test.huggg.me/offers/ar0f27404f6557f8a7ac62ec289d689a0654af1879.png",
			"claim_image": "ar0f27404f6557f8a7ac62ec289d689a0654af1879.png",
			"claim_image_url": "https://test.huggg.me/offers/ar0f27404f6557f8a7ac62ec289d689a0654af1879.png",
			"imessage_image": "ar0f27404f6557f8a7ac62ec289d689a0654af1879.png",
			"imessage_image_url": "https://test.huggg.me/offers/ar0f27404f6557f8a7ac62ec289d689a0654af1879.png",
			"open_graph_image_url": "https://test.huggg.me/offers/ar8097cecde4194ef95c5489c54a08ccdf837fc0a0.png"
		},
		{
			"id": "84fa5849-472e-4625-ab86-8f4540138363",
			"created_at": "2019-06-03 11:16:00",
			"updated_at": "2019-06-03 12:16:00",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"description": "Any 12 doughnuts.",
			"campaign": null,
			"label": "12-Pack Doughnut",
			"internal_name": "",
			"integration": "",
			"price": "34.00",
			"over_18_offer": 0,
			"redemption_instructions": "Tap in the PIN for the store you're in, then hit 'Redeem Now'.",
			"image": "ar90f3119ed657b672f3c89aaf4c0133b245ddfdd8.png",
			"subtitle": "London",
			"weight": 82997151,
			"recipient_description": "Swap your huggg for any 12 doughnuts.",
			"tag_group_id": "",
			"tag_id": "",
			"open_graph_image": "ar1a940045fb20b0ffd535abb266f16c5a5d1dc890.png",
			"active": 1,
			"on_app": 1,
			"on_imessage": 1,
			"handling_fee": 20,
			"sale_price": 3400,
			"huggg_tag": null,
			"vat_voucher_type": "SPV",
			"vat": null,
			"brand_name": "Crosstown Doughnuts",
			"brand_weight": 1060,
			"image_url": "https://test.huggg.me/offers/ar90f3119ed657b672f3c89aaf4c0133b245ddfdd8.png",
			"claim_image": "ar90f3119ed657b672f3c89aaf4c0133b245ddfdd8.png",
			"claim_image_url": "https://test.huggg.me/offers/ar90f3119ed657b672f3c89aaf4c0133b245ddfdd8.png",
			"imessage_image": "ar90f3119ed657b672f3c89aaf4c0133b245ddfdd8.png",
			"imessage_image_url": "https://test.huggg.me/offers/ar90f3119ed657b672f3c89aaf4c0133b245ddfdd8.png",
			"open_graph_image_url": "https://test.huggg.me/offers/ar1a940045fb20b0ffd535abb266f16c5a5d1dc890.png"
		},
		{
			"id": "26f7a82a-30a8-44e4-93cb-499a256d0ce9",
			"created_at": "2019-06-03 11:15:59",
			"updated_at": "2019-06-03 12:15:59",
			"brand_id": "66462cd6-e43c-4ab6-8e6f-004ca189e4b9",
			"description": "A coffee item from any participating coffee shop.",
			"campaign": null,
			"label": "Coffee",
			"internal_name": "",
			"integration": "",
			"price": "3.00",
			"over_18_offer": 0,
			"redemption_instructions": "Tap in the PIN for the store you're in, then hit 'verify code'.",
			"image": "arf691e013d333fd2272cd66ef26f776122b8cf4c7.png",
			"subtitle": "Bristol, Bath or London",
			"weight": 898481262,
			"recipient_description": "Show to get any coffee type from a participating coffee shop. Check out the map pin for any location-specific exclusions.",
			"tag_group_id": "",
			"tag_id": "",
			"open_graph_image": "ar654462ca242198ab9bedde58baa19a88a51b0601.png",
			"active": 1,
			"on_app": 1,
			"on_imessage": 1,
			"handling_fee": 20,
			"sale_price": 300,
			"huggg_tag": null,
			"vat_voucher_type": "SPV",
			"vat": null,
			"brand_name": "independent coffee locations",
			"brand_weight": 1080,
			"image_url": "https://test.huggg.me/offers/arf691e013d333fd2272cd66ef26f776122b8cf4c7.png",
			"claim_image": "arf691e013d333fd2272cd66ef26f776122b8cf4c7.png",
			"claim_image_url": "https://test.huggg.me/offers/arf691e013d333fd2272cd66ef26f776122b8cf4c7.png",
			"imessage_image": "arf691e013d333fd2272cd66ef26f776122b8cf4c7.png",
			"imessage_image_url": "https://test.huggg.me/offers/arf691e013d333fd2272cd66ef26f776122b8cf4c7.png",
			"open_graph_image_url": "https://test.huggg.me/offers/ar654462ca242198ab9bedde58baa19a88a51b0601.png",
			"pivot": {
				"brand_id": "01c25854-6b19-4494-be81-777284b34d2f",
				"price_id": "26f7a82a-30a8-44e4-93cb-499a256d0ce9"
			}
		}
	],
	"count": 4
}
```

**Brand: CAYA Club**
**UUID: 01c25854-6b19-4494-be81-777284b34d2f**

No products and 1 consolidated product

```bash
# Without jq installed
# URL also can be visited in the browser
curl -X GET https://huggg-challenge-api-production.h9software.workers.dev/v1/api/brands/01c25854-6b19-4494-be81-777284b34d2f/products

# With jq installed
curl -X GET https://huggg-challenge-api-production.h9software.workers.dev/v1/api/brands/01c25854-6b19-4494-be81-777284b34d2f/products | jq .
```

Expected response:

```json
{
	"products": [
		{
			"id": "26f7a82a-30a8-44e4-93cb-499a256d0ce9",
			"created_at": "2019-06-03 11:15:59",
			"updated_at": "2019-06-03 12:15:59",
			"brand_id": "66462cd6-e43c-4ab6-8e6f-004ca189e4b9",
			"description": "A coffee item from any participating coffee shop.",
			"campaign": null,
			"label": "Coffee",
			"internal_name": "",
			"integration": "",
			"price": "3.00",
			"over_18_offer": 0,
			"redemption_instructions": "Tap in the PIN for the store you're in, then hit 'verify code'.",
			"image": "arf691e013d333fd2272cd66ef26f776122b8cf4c7.png",
			"subtitle": "Bristol, Bath or London",
			"weight": 898481262,
			"recipient_description": "Show to get any coffee type from a participating coffee shop. Check out the map pin for any location-specific exclusions.",
			"tag_group_id": "",
			"tag_id": "",
			"open_graph_image": "ar654462ca242198ab9bedde58baa19a88a51b0601.png",
			"active": 1,
			"on_app": 1,
			"on_imessage": 1,
			"handling_fee": 20,
			"sale_price": 300,
			"huggg_tag": null,
			"vat_voucher_type": "SPV",
			"vat": null,
			"brand_name": "independent coffee locations",
			"brand_weight": 1080,
			"image_url": "https://test.huggg.me/offers/arf691e013d333fd2272cd66ef26f776122b8cf4c7.png",
			"claim_image": "arf691e013d333fd2272cd66ef26f776122b8cf4c7.png",
			"claim_image_url": "https://test.huggg.me/offers/arf691e013d333fd2272cd66ef26f776122b8cf4c7.png",
			"imessage_image": "arf691e013d333fd2272cd66ef26f776122b8cf4c7.png",
			"imessage_image_url": "https://test.huggg.me/offers/arf691e013d333fd2272cd66ef26f776122b8cf4c7.png",
			"open_graph_image_url": "https://test.huggg.me/offers/ar654462ca242198ab9bedde58baa19a88a51b0601.png",
			"pivot": {
				"brand_id": "01c25854-6b19-4494-be81-777284b34d2f",
				"price_id": "26f7a82a-30a8-44e4-93cb-499a256d0ce9"
			}
		}
	],
	"count": 1
}
```

#### Test cases (GET /v1/api/products/:productId/stores)

**Product: Fake Product**
**UUID: foo-bar-not-real-uuid**

```bash
# Without jq installed
# URL also can be visited in the browser
curl -X GET https://huggg-challenge-api-production.h9software.workers.dev/v1/api/products/foo-bar-not-real-uuid/stores

# With jq installed
curl -X GET https://huggg-challenge-api-production.h9software.workers.dev/v1/api/products/foo-bar-not-real-uuid/stores | jq .
```

Expected response:

```json
{
	"error": "Product not found"
}
```

**Product: Prosecco**
**UUID: 29a756ae-9ddb-412f-b378-c42e1bc50831**

Available in 1 Brand, but that Brand is in 25 Stores

```bash
# Without jq installed
# URL also can be visited in the browser
curl -X GET https://huggg-challenge-api-production.h9software.workers.dev/v1/api/products/29a756ae-9ddb-412f-b378-c42e1bc50831/stores

# With jq installed
curl -X GET https://huggg-challenge-api-production.h9software.workers.dev/v1/api/products/29a756ae-9ddb-412f-b378-c42e1bc50831/stores | jq .
```

Expected response:

```json
{
	"stores": [
		{
			"id": "0103f7ae-bce7-4cee-b058-9ea4df4325db",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.4533982",
			"longitude": "-0.9691796",
			"website": null,
			"name": "Browns Reading",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.4533982"
		},
		{
			"id": "084c7e72-2a7b-436e-8a7e-4647ff68732c",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.456292",
			"longitude": "-2.605822",
			"website": "\"\"",
			"name": "Browns Bristol",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.456292"
		},
		{
			"id": "18e29800-4122-4efb-94de-8d885bb4e520",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "52.038441",
			"longitude": "-0.763351",
			"website": null,
			"name": "Browns Milton Keynes",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "52.038441"
		},
		{
			"id": "2985057c-36a0-4631-b391-4be907170aa3",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.5140783",
			"longitude": "-0.0908371",
			"website": "\"\"",
			"name": "Browns Old Jewry",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.5140783"
		},
		{
			"id": "35e5fba0-cfe2-4ccd-b4a2-824a1276872b",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "55.952265",
			"longitude": "-3.2057379",
			"website": null,
			"name": "Browns Edinburgh",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "55.952265"
		},
		{
			"id": "435c1adf-3e12-4dd4-88cc-bfaaaa041df7",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.4094192",
			"longitude": "-0.3083226",
			"website": "\"\"",
			"name": "Browns Kingston",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.4094192"
		},
		{
			"id": "58a276a1-1fc6-4150-83fb-ababfc24a4cf",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.437302",
			"longitude": "0.270171",
			"website": "\"\"",
			"name": "Browns Bluewater",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.437302"
		},
		{
			"id": "612e225e-a993-4017-8ec6-4423798148d4",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.4848547",
			"longitude": "-0.6093526",
			"website": "\"\"",
			"name": "Browns Windsor",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.4848547"
		},
		{
			"id": "74e9287c-43b3-45b7-8f80-1be25ef4ec17",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.759115",
			"longitude": "-1.2611426",
			"website": null,
			"name": "Browns Oxford",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.759115"
		},
		{
			"id": "785b419c-58d5-41f0-a303-ede0555d1f6d",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "52.9533153",
			"longitude": "-1.1557619",
			"website": null,
			"name": "Browns Nottingham",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "52.9533153"
		},
		{
			"id": "7ae22726-4434-42e3-bcc0-9f7bc64b4d1e",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "54.9717858",
			"longitude": "-1.6120457",
			"website": null,
			"name": "Browns Newcastle",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "54.9717858"
		},
		{
			"id": "8a25925b-d8bf-46da-a95c-8452b56efc9e",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.4973336",
			"longitude": "-0.1411868",
			"website": "\"\"",
			"name": "Browns Victoria",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.4973336"
		},
		{
			"id": "953f46c9-43db-437b-9229-25e891aa3a2b",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.511314",
			"longitude": "-0.127275",
			"website": "\"\"",
			"name": "Browns Covent Garden",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.511314"
		},
		{
			"id": "aac09cd7-b156-475e-a521-be06b7c5ce89",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "53.799705",
			"longitude": "-1.5466812",
			"website": null,
			"name": "Browns Leeds",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "53.799705"
		},
		{
			"id": "ab03137d-9d9c-49ee-9452-28e3098ad5bf",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.381913",
			"longitude": "-2.358133",
			"website": "",
			"name": "Browns Bath",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.381913"
		},
		{
			"id": "b04bdab1-b3ab-4569-814c-ba921d187639",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.5124304",
			"longitude": "-0.1438138",
			"website": "\"\"",
			"name": "Browns Mayfair",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.5124304"
		},
		{
			"id": "b443f4dd-1bfa-48d5-817b-6b52b4f9c7b0",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "52.476982",
			"longitude": "-1.8939578",
			"website": null,
			"name": "Browns Birmingham",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "52.476982"
		},
		{
			"id": "c5fd6366-e028-4576-abe7-503bd3cbcb8a",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.5073443",
			"longitude": "-0.021867",
			"website": "\"\"",
			"name": "Browns West India Quay",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.5073443"
		},
		{
			"id": "dc97dc92-cc17-4443-8080-09ce2753f23a",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "50.8226064",
			"longitude": "-0.1422767",
			"website": null,
			"name": "Browns Brighton",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "50.8226064"
		},
		{
			"id": "e1a9d785-d443-4840-b476-2e8244ed170c",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "53.379343",
			"longitude": "-1.4697875",
			"website": null,
			"name": "Browns Sheffield",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "53.379343"
		},
		{
			"id": "e4e7095e-5fc7-4ea1-a6a4-36facaaf8ce2",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "53.48111",
			"longitude": "-2.24155",
			"website": null,
			"name": "Browns Manchester",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "53.48111"
		},
		{
			"id": "ebaa1be2-a0ed-4bba-b40a-f626389fbe8d",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "51.5027926",
			"longitude": "-0.0717482",
			"website": "\"\"",
			"name": "Browns Butlers Wharf",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "51.5027926"
		},
		{
			"id": "ee9b1b25-e328-4c6b-a597-1a45731d3513",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "55.860611",
			"longitude": "-4.2494231",
			"website": null,
			"name": "Browns Glasgow",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "55.860611"
		},
		{
			"id": "ef1935df-ec37-402d-96b8-c3e387eb4bff",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "53.4031996",
			"longitude": "-2.9857674",
			"website": null,
			"name": "Browns Liverpool",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "53.4031996"
		},
		{
			"id": "f28aa336-6156-48ca-a92d-02f52d97cf71",
			"brand_id": "b6ede6ad-a50d-4b60-b423-69f9ed703329",
			"latitiude": "52.1995998",
			"longitude": "0.1214693",
			"website": null,
			"name": "Browns Cambridge",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"image_url": "https://cdn.huggg.me/locations/are7196865c2980831dbc7e6b53f1400c3ae481404.png",
			"latitude": "52.1995998"
		}
	],
	"count": 25
}
```

**Product: Coffee**
**UUID: 26f7a82a-30a8-44e4-93cb-499a256d0ce9**

Available in Many Brands where each Brand is in 1 or more stores
Total expected stores = 46

```bash
# Without jq installed
# URL also can be visited in the browser
curl -X GET https://huggg-challenge-api-production.h9software.workers.dev/v1/api/products/26f7a82a-30a8-44e4-93cb-499a256d0ce9/stores

# With jq installed
curl -X GET https://huggg-challenge-api-production.h9software.workers.dev/v1/api/products/26f7a82a-30a8-44e4-93cb-499a256d0ce9/stores | jq .
```

Expected response:

```json
{
	"stores": [
		{
			"id": "1236a970-8e75-4c35-8aa6-1e37e204f334",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.504108",
			"longitude": "-0.114614",
			"website": null,
			"name": "Crosstown Doughnuts (Waterloo)",
			"description": "Does not accept Coffee Anywhere. Fresh handcrafted doughnuts.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.504108"
		},
		{
			"id": "1d65fd4e-8af3-432c-88bf-afc22e2aff70",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.534608",
			"longitude": "-0.048066",
			"website": null,
			"name": "Vegan Crosstown Doughnuts (Victoria Park Market)",
			"description": "Does not accept Coffee Anywhere. Open Sun 10:00-16:00 only.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.534608"
		},
		{
			"id": "267878a5-3e70-4abb-938a-21136178f76f",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.481449",
			"longitude": "-0.009355",
			"website": null,
			"name": "Crosstown Doughnuts (Greenwich)",
			"description": "Fresh handcrafted doughnuts and coffee.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.481449"
		},
		{
			"id": "3b1a5315-6b82-4a3b-9c80-ebcb02939438",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.467928",
			"longitude": "-0.024699",
			"website": null,
			"name": "Vegan Crosstown Doughnuts (Brockley Market)",
			"description": "Does not accept Coffee Anywhere. Open Sat 10:00-14:00 only.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.467928"
		},
		{
			"id": "44d7d2e4-4450-4891-88c6-3cb7211650a3",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.537452",
			"longitude": "-0.061027",
			"website": null,
			"name": "Crosstown Doughnuts (Broadway Market)",
			"description": "Does not accept Coffee Anywhere. Open Sat 10:00-16:00 only.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.537452"
		},
		{
			"id": "667991b0-94fe-4cbd-ac15-4ce18430f647",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.520136",
			"longitude": "-0.075905",
			"website": null,
			"name": "Crosstown Doughnuts (Spitalfields)",
			"description": "Does not accept Coffee Anywhere. Open Mon-Fri 09:30-18:00, Sat 10:30-17:00, Sun 10:00-17:00.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.520136"
		},
		{
			"id": "6836e358-8725-41bc-8058-028ea3382f9a",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.529894",
			"longitude": "-0.124955",
			"website": null,
			"name": "Crosstown Doughnuts (Real Food Market Kings Cross)",
			"description": "Does not accept Coffee Anywhere. Open Wed-Fri 08:00-19:00 only.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.529894"
		},
		{
			"id": "9632e80b-81c1-40fa-a062-8cc7f3674dd2",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.511563",
			"longitude": "-0.088965",
			"website": null,
			"name": "Crosstown Doughnuts (City)",
			"description": "Open Mon-Fri 07:00-19:00 or until sold out.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.511563"
		},
		{
			"id": "99c71149-0bcc-49f2-b173-c3f41103d0a5",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.517031",
			"longitude": "-0.134997",
			"website": null,
			"name": "Crosstown Doughnuts (Fitzrovia)",
			"description": "Open Mon-Fri 08:00-18:00 or until sold out.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.517031"
		},
		{
			"id": "9a9903e8-dbe5-4613-8d7f-d7d3806b5e51",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.497314",
			"longitude": "-0.143840",
			"website": null,
			"name": "Crosstown Doughnuts (Victoria)",
			"description": "Fresh handcrafted doughnuts and coffee.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.497314"
		},
		{
			"id": "9f829adf-7740-4e6e-b65c-45219a6501de",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.514085",
			"longitude": "-0.134652",
			"website": null,
			"name": "Crosstown Doughnuts (Soho)",
			"description": "Fresh handcrafted doughnuts and coffee.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.514085"
		},
		{
			"id": "b53fba4c-d7aa-4d31-8c48-f19750710a05",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.515426",
			"longitude": "-0.151485",
			"website": null,
			"name": "Vegan Crosstown Doughnuts (Marylebone)",
			"description": "Fresh handcrafted doughnuts and coffee.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.515426"
		},
		{
			"id": "e38bcad3-5c6d-489a-83ca-759e282bff87",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.492815",
			"longitude": "-0.224294",
			"website": null,
			"name": "Crosstown Doughnuts (Hammersmith)",
			"description": "Does not accept Coffee Anywhere. Fresh handcrafted doughnuts.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.492815"
		},
		{
			"id": "ed056404-f07d-4706-b776-f7a068d0fad4",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.521650",
			"longitude": "-0.110400",
			"website": null,
			"name": "Crosstown Doughnuts (Leather Lane Market)",
			"description": "Does not accept Coffee Anywhere. Open Fri 10:00-14:00 only.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.521650"
		},
		{
			"id": "f16f353a-a280-4806-a43e-5513b8871799",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.524436",
			"longitude": "-0.071681",
			"website": null,
			"name": "Crosstown Doughnuts (Shoreditch)",
			"description": "Fresh handcrafted doughnuts and coffee.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.524436"
		},
		{
			"id": "f7d95965-5a4f-46ed-a815-8fce6172654b",
			"brand_id": "a715b837-f4fc-48ba-ba0a-7f53b6dc59c5",
			"latitiude": "51.509235",
			"longitude": "-0.137134",
			"website": null,
			"name": "Crosstown Doughnuts (Piccadilly)",
			"description": "Fresh handcrafted doughnuts and coffee.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"image_url": "https://cdn.huggg.me/locations/ar388d0482c0da0500f78af4e0ddc9db1f6cd3aa81.png",
			"latitude": "51.509235"
		},
		{
			"id": "120cad4a-d5ed-4e69-9619-193943518a64",
			"brand_id": "69be9b8c-5b95-4792-a05c-652d2f15a62f",
			"latitiude": "51.514858",
			"longitude": "-0.097494",
			"website": null,
			"name": "Taylor St. Baristas (St Paul's)",
			"description": "Artisan coffee at its best.",
			"visible": 1,
			"description_markdown": "",
			"image": "are11946747092e3cac7f0f62755270f761620cc22.png",
			"image_url": "https://cdn.huggg.me/locations/are11946747092e3cac7f0f62755270f761620cc22.png",
			"latitude": "51.514858"
		},
		{
			"id": "4b88a907-25a2-42fe-9fde-4b8c82bad72b",
			"brand_id": "69be9b8c-5b95-4792-a05c-652d2f15a62f",
			"latitiude": "51.498702",
			"longitude": "-0.014568",
			"website": null,
			"name": "Taylor St. Baristas (South Quay)",
			"description": "Artisan coffee at its best.",
			"visible": 1,
			"description_markdown": "",
			"image": "are11946747092e3cac7f0f62755270f761620cc22.png",
			"image_url": "https://cdn.huggg.me/locations/are11946747092e3cac7f0f62755270f761620cc22.png",
			"latitude": "51.498702"
		},
		{
			"id": "57dcdd98-34fb-49e8-b046-ecd03ddade6a",
			"brand_id": "69be9b8c-5b95-4792-a05c-652d2f15a62f",
			"latitiude": "51.523927",
			"longitude": "-0.082344",
			"website": null,
			"name": "Taylor St. Baristas (Shoreditch)",
			"description": "Artisan coffee at its best.",
			"visible": 1,
			"description_markdown": "",
			"image": "are11946747092e3cac7f0f62755270f761620cc22.png",
			"image_url": "https://cdn.huggg.me/locations/are11946747092e3cac7f0f62755270f761620cc22.png",
			"latitude": "51.523927"
		},
		{
			"id": "70ef8cf6-f96d-41e6-9993-e2b38a46654a",
			"brand_id": "69be9b8c-5b95-4792-a05c-652d2f15a62f",
			"latitiude": "51.504774",
			"longitude": "-0.021916",
			"website": null,
			"name": "Taylor St. Baristas (Canary Wharf)",
			"description": "Artisan coffee at its best.",
			"visible": 1,
			"description_markdown": "",
			"image": "are11946747092e3cac7f0f62755270f761620cc22.png",
			"image_url": "https://cdn.huggg.me/locations/are11946747092e3cac7f0f62755270f761620cc22.png",
			"latitude": "51.504774"
		},
		{
			"id": "9924e2b4-4a98-4c40-a0f1-bf3325be661e",
			"brand_id": "69be9b8c-5b95-4792-a05c-652d2f15a62f",
			"latitiude": "51.517443",
			"longitude": "-0.079998",
			"website": null,
			"name": "Taylor St. Baristas (Liverpool St)",
			"description": "Artisan coffee at its best.",
			"visible": 1,
			"description_markdown": "",
			"image": "are11946747092e3cac7f0f62755270f761620cc22.png",
			"image_url": "https://cdn.huggg.me/locations/are11946747092e3cac7f0f62755270f761620cc22.png",
			"latitude": "51.517443"
		},
		{
			"id": "b98bac59-72ba-46ae-ad2e-eaae1cad7a7b",
			"brand_id": "69be9b8c-5b95-4792-a05c-652d2f15a62f",
			"latitiude": "51.514539",
			"longitude": "-0.086422",
			"website": null,
			"name": "Taylor St. Baristas (Bank)",
			"description": "Artisan coffee at its best.",
			"visible": 1,
			"description_markdown": "",
			"image": "are11946747092e3cac7f0f62755270f761620cc22.png",
			"image_url": "https://cdn.huggg.me/locations/are11946747092e3cac7f0f62755270f761620cc22.png",
			"latitude": "51.514539"
		},
		{
			"id": "bcace9a2-c850-46fd-9902-28abde12de2d",
			"brand_id": "69be9b8c-5b95-4792-a05c-652d2f15a62f",
			"latitiude": "51.510182",
			"longitude": "-0.084288",
			"website": null,
			"name": "Taylor St. Baristas (Monument)",
			"description": "Artisan coffee at its best.",
			"visible": 1,
			"description_markdown": "",
			"image": "are11946747092e3cac7f0f62755270f761620cc22.png",
			"image_url": "https://cdn.huggg.me/locations/are11946747092e3cac7f0f62755270f761620cc22.png",
			"latitude": "51.510182"
		},
		{
			"id": "e13b68c7-1e67-4c9f-a64d-202d6896de46",
			"brand_id": "69be9b8c-5b95-4792-a05c-652d2f15a62f",
			"latitiude": "51.512207",
			"longitude": "-0.147240",
			"website": null,
			"name": "Taylor St. Baristas (Mayfair)",
			"description": "Artisan coffee at its best.",
			"visible": 1,
			"description_markdown": "",
			"image": "are11946747092e3cac7f0f62755270f761620cc22.png",
			"image_url": "https://cdn.huggg.me/locations/are11946747092e3cac7f0f62755270f761620cc22.png",
			"latitude": "51.512207"
		},
		{
			"id": "f26e4aca-17ea-47ca-8b10-5e9964552c5a",
			"brand_id": "69be9b8c-5b95-4792-a05c-652d2f15a62f",
			"latitiude": "51.517473",
			"longitude": "-0.112016",
			"website": null,
			"name": "Taylor St. Baristas (Chancery Lane)",
			"description": "Artisan coffee at its best.",
			"visible": 1,
			"description_markdown": "",
			"image": "are11946747092e3cac7f0f62755270f761620cc22.png",
			"image_url": "https://cdn.huggg.me/locations/are11946747092e3cac7f0f62755270f761620cc22.png",
			"latitude": "51.517473"
		},
		{
			"id": "ba87c0e6-82a4-411f-9014-7ad0a68ac5f4",
			"brand_id": "1f93dfab-8c4e-405a-95cc-c14c01a68773",
			"latitiude": "51.511131",
			"longitude": "-0.126505",
			"website": null,
			"name": "Espresso Room (Covent Garden)",
			"description": "Specialty coffee and homemade cakes.",
			"visible": 1,
			"description_markdown": "",
			"image": "arc6786fbc6d819b0b92a31dd6fb985a9ef0cda747.png",
			"image_url": "https://cdn.huggg.me/locations/arc6786fbc6d819b0b92a31dd6fb985a9ef0cda747.png",
			"latitude": "51.511131"
		},
		{
			"id": "ee65e122-8209-4bfa-8e61-f02d70b88416",
			"brand_id": "1f93dfab-8c4e-405a-95cc-c14c01a68773",
			"latitiude": "51.5218808",
			"longitude": "-0.1203722",
			"website": null,
			"name": "Espresso Room (Bloomsbury)",
			"description": "Specialty coffee and homemade cakes.",
			"visible": 1,
			"description_markdown": "",
			"image": "arc6786fbc6d819b0b92a31dd6fb985a9ef0cda747.png",
			"image_url": "https://cdn.huggg.me/locations/arc6786fbc6d819b0b92a31dd6fb985a9ef0cda747.png",
			"latitude": "51.5218808"
		},
		{
			"id": "f74a4871-d82c-414d-8885-050a8b61d29e",
			"brand_id": "1f93dfab-8c4e-405a-95cc-c14c01a68773",
			"latitiude": "51.516757",
			"longitude": "-0.118965",
			"website": null,
			"name": "Espresso Room (Holborn)",
			"description": "Specialty coffee and homemade cakes.",
			"visible": 1,
			"description_markdown": "",
			"image": "arc6786fbc6d819b0b92a31dd6fb985a9ef0cda747.png",
			"image_url": "https://cdn.huggg.me/locations/arc6786fbc6d819b0b92a31dd6fb985a9ef0cda747.png",
			"latitude": "51.516757"
		},
		{
			"id": "fa8eda05-5acb-48d8-9cb3-3feb3da6241a",
			"brand_id": "1f93dfab-8c4e-405a-95cc-c14c01a68773",
			"latitiude": "51.51829",
			"longitude": "-0.120933",
			"website": null,
			"name": "Espresso Room (Southampton Row)",
			"description": "Specialty coffee and homemade cakes.",
			"visible": 1,
			"description_markdown": "",
			"image": "arc6786fbc6d819b0b92a31dd6fb985a9ef0cda747.png",
			"image_url": "https://cdn.huggg.me/locations/arc6786fbc6d819b0b92a31dd6fb985a9ef0cda747.png",
			"latitude": "51.51829"
		},
		{
			"id": "569d9684-341a-4ad8-bc33-d35b1fc543ed",
			"brand_id": "160edae7-e35c-443b-80f4-88bfd7d171d5",
			"latitiude": "51.497991",
			"longitude": "-0.081319",
			"website": null,
			"name": "The Watch House (Bermondsey Street)",
			"description": "Speciality coffee and homemade food.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar2d2a829637ce7efcbc5b63a2871c10588cd57055.png",
			"image_url": "https://cdn.huggg.me/locations/ar2d2a829637ce7efcbc5b63a2871c10588cd57055.png",
			"latitude": "51.497991"
		},
		{
			"id": "7c24eeac-cead-4179-9c02-776a738c3ced",
			"brand_id": "160edae7-e35c-443b-80f4-88bfd7d171d5",
			"latitiude": "51.516789",
			"longitude": "-0.109191",
			"website": null,
			"name": "The Watch House (Fetter Lane)",
			"description": "Speciality coffee and homemade food.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar2d2a829637ce7efcbc5b63a2871c10588cd57055.png",
			"image_url": "https://cdn.huggg.me/locations/ar2d2a829637ce7efcbc5b63a2871c10588cd57055.png",
			"latitude": "51.516789"
		},
		{
			"id": "e55a7cf5-950b-45e1-ab26-a3cd4cf26189",
			"brand_id": "160edae7-e35c-443b-80f4-88bfd7d171d5",
			"latitiude": "51.503441",
			"longitude": "-0.073702",
			"website": null,
			"name": "The Watch House (Tower Bridge)",
			"description": "Speciality coffee and homemade food.",
			"visible": 1,
			"description_markdown": "",
			"image": "ar2d2a829637ce7efcbc5b63a2871c10588cd57055.png",
			"image_url": "https://cdn.huggg.me/locations/ar2d2a829637ce7efcbc5b63a2871c10588cd57055.png",
			"latitude": "51.503441"
		},
		{
			"id": "ea7000e3-ad1b-4309-9fb4-6d35c0b9b4c4",
			"brand_id": "15538f17-95bd-4cc4-9cf3-893a21d16028",
			"latitiude": "51.449891",
			"longitude": "-2.3572502",
			"website": null,
			"name": "Bristol Station",
			"description": "",
			"visible": 1,
			"description_markdown": "**Bristol Station Marker**\n\nHas it's own description! \n\n😲",
			"image": "74d11be7862369713bb39a2a3502d6dd1fc8d206.png",
			"image_url": "https://test.huggg.me/locations/74d11be7862369713bb39a2a3502d6dd1fc8d206.png",
			"latitude": "51.449891"
		},
		{
			"id": "391f749b-99d0-4dd7-9dd2-e6d130cadb06",
			"brand_id": "6fa700c8-4367-43b0-8b79-dc6f2e58901b",
			"latitiude": "51.449890",
			"longitude": "-2.3572502",
			"website": null,
			"name": "Bristol Station",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "18990049d3f6dccea359fa4527c9e42685589178.png",
			"image_url": "https://test.huggg.me/locations/18990049d3f6dccea359fa4527c9e42685589178.png",
			"latitude": "51.449890"
		},
		{
			"id": "3150a400-7303-4c89-b3b7-bca34a02d904",
			"brand_id": "9e225078-d157-4402-8590-60df83de40d6",
			"latitiude": "51.456421",
			"longitude": "-2.593695",
			"website": "",
			"name": "Site 1",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "4d031ba0d8058e1a041c5b6d2376baad0e0f9749.png",
			"image_url": "https://test.huggg.me/locations/4d031ba0d8058e1a041c5b6d2376baad0e0f9749.png",
			"latitude": "51.456421"
		},
		{
			"id": "405e9503-6509-480d-92e9-3b7bf4877234",
			"brand_id": "9e225078-d157-4402-8590-60df83de40d6",
			"latitiude": "51.478421",
			"longitude": "",
			"website": "",
			"name": "",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "4d031ba0d8058e1a041c5b6d2376baad0e0f9749.png",
			"image_url": "https://test.huggg.me/locations/4d031ba0d8058e1a041c5b6d2376baad0e0f9749.png",
			"latitude": "51.478421"
		},
		{
			"id": "69468043-2775-4620-bccb-7ca21b58bb9a",
			"brand_id": "9e225078-d157-4402-8590-60df83de40d6",
			"latitiude": "51.4565",
			"longitude": "-2.598695",
			"website": "",
			"name": "Site 2",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "4d031ba0d8058e1a041c5b6d2376baad0e0f9749.png",
			"image_url": "https://test.huggg.me/locations/4d031ba0d8058e1a041c5b6d2376baad0e0f9749.png",
			"latitude": "51.4565"
		},
		{
			"id": "97942c11-269b-4d91-bec0-d33f9ae1a63a",
			"brand_id": "9e225078-d157-4402-8590-60df83de40d6",
			"latitiude": "51.478421",
			"longitude": "-2.693695",
			"website": "",
			"name": "Site 3",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "4d031ba0d8058e1a041c5b6d2376baad0e0f9749.png",
			"image_url": "https://test.huggg.me/locations/4d031ba0d8058e1a041c5b6d2376baad0e0f9749.png",
			"latitude": "51.478421"
		},
		{
			"id": "aeffb0a6-de20-4874-88b6-06a1c6241a6a",
			"brand_id": "9e225078-d157-4402-8590-60df83de40d6",
			"latitiude": "51.449890",
			"longitude": "-2.581013",
			"website": null,
			"name": "Bristol Station",
			"description": "This is Bristol Station",
			"visible": 1,
			"description_markdown": "",
			"image": "74d11be7862369713bb39a2a3502d6dd1fc8d206.png",
			"image_url": "https://test.huggg.me/locations/74d11be7862369713bb39a2a3502d6dd1fc8d206.png",
			"latitude": "51.449890"
		},
		{
			"id": "e3e6dbef-e723-4b09-bac9-89759eb6e7df",
			"brand_id": "9e225078-d157-4402-8590-60df83de40d6",
			"latitiude": "51.478421",
			"longitude": "",
			"website": "",
			"name": "Site 4",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "4d031ba0d8058e1a041c5b6d2376baad0e0f9749.png",
			"image_url": "https://test.huggg.me/locations/4d031ba0d8058e1a041c5b6d2376baad0e0f9749.png",
			"latitude": "51.478421"
		},
		{
			"id": "a3d3809f-fb76-4720-aa38-ca7bcaeacdd2",
			"brand_id": "32111cd0-db1d-4314-bfd2-619421249b41",
			"latitiude": "51.446896",
			"longitude": "-2.599165",
			"website": null,
			"name": "The Juice Box",
			"description": "Cold pressed juice and coffee.",
			"visible": 1,
			"description_markdown": "",
			"image": "ard466d7f7c2e71a8eea6f8b9a03413e8a2601c594.png",
			"image_url": "https://cdn.huggg.me/locations/ard466d7f7c2e71a8eea6f8b9a03413e8a2601c594.png",
			"latitude": "51.446896"
		},
		{
			"id": "26fe095b-e759-4026-bcc2-9ef046e65416",
			"brand_id": "1bb152d8-e912-46d4-a40d-c4eeeeb3cca0",
			"latitiude": "51.462946",
			"longitude": "-0.169989",
			"website": null,
			"name": "Story Works",
			"description": "Speciality Coffee and all day brunch.",
			"visible": 1,
			"description_markdown": "",
			"image": "arc1dbe2202a5a080987e020ff8d8b792779acdeac.png",
			"image_url": "https://cdn.huggg.me/locations/arc1dbe2202a5a080987e020ff8d8b792779acdeac.png",
			"latitude": "51.462946"
		},
		{
			"id": "4ffec9a1-7cdc-444c-982f-0fda2f7d0d01",
			"brand_id": "1bb152d8-e912-46d4-a40d-c4eeeeb3cca0",
			"latitiude": "51.461029",
			"longitude": "-0.174411",
			"website": null,
			"name": "Story Coffee",
			"description": "Speciality Coffee and all day brunch.",
			"visible": 1,
			"description_markdown": "",
			"image": "arc1dbe2202a5a080987e020ff8d8b792779acdeac.png",
			"image_url": "https://cdn.huggg.me/locations/arc1dbe2202a5a080987e020ff8d8b792779acdeac.png",
			"latitude": "51.461029"
		},
		{
			"id": "26d3b556-0160-48b2-99e5-d313e46f5ef0",
			"brand_id": "1b9f5fae-4e2e-429c-9372-940022473129",
			"latitiude": "51.381520",
			"longitude": "-2.363325",
			"website": null,
			"name": "Swoon Gelato",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "arbc78d5a4541e1fbd69ac9b0d3a9673b834108b81.png",
			"image_url": "https://cdn.huggg.me/locations/arbc78d5a4541e1fbd69ac9b0d3a9673b834108b81.png",
			"latitude": "51.381520"
		},
		{
			"id": "892beff3-c85b-44ba-855c-e2066f23a7fa",
			"brand_id": "1b9f5fae-4e2e-429c-9372-940022473129",
			"latitiude": "51.452753",
			"longitude": "-2.600043",
			"website": null,
			"name": "Swoon Gelato",
			"description": "",
			"visible": 1,
			"description_markdown": "",
			"image": "arbc78d5a4541e1fbd69ac9b0d3a9673b834108b81.png",
			"image_url": "https://cdn.huggg.me/locations/arbc78d5a4541e1fbd69ac9b0d3a9673b834108b81.png",
			"latitude": "51.452753"
		},
		{
			"id": "820d2c40-8ee1-4853-9865-45edaee1f1c8",
			"brand_id": "01c25854-6b19-4494-be81-777284b34d2f",
			"latitiude": "51.462836",
			"longitude": "-0.108781",
			"website": null,
			"name": "CAYA Club",
			"description": "Brixton coffee shop and co-working space.",
			"visible": 1,
			"description_markdown": "",
			"image": "ardf1fdef8f45a2068164839a2895e4841fba2a750.png",
			"image_url": "https://cdn.huggg.me/locations/ardf1fdef8f45a2068164839a2895e4841fba2a750.png",
			"latitude": "51.462836"
		}
	],
	"count": 46
}
```
