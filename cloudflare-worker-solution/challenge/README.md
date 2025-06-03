# Engineer Tech Test

Thanks for your interest in joining our team! This test is an example of the sort of work we do here at huggg.

## Specification

You have a service which returns all relevant information for our brands, which can potentially be a very large amount of information. Your task is to provide access to discrete pieces of information via HTTP GET endpoints. These should include:

- Get all product entities for a brand by brand-id
- Get all store entities for a product by product-id

The format of the data your service should return is JSON. You should make a mock service which returns this.

Note: Some of our brands and products are "consolidated" which means the product is available at multiple brands + stores. So a single product may belong to multiple brands, as well as its "true" parent. When returning a brand's products, these consolidated products should also be returned.

## What we are looking for

- We're keen on seeing your best work here so make sure you take your time to fully understand the data and the problem
- Use of automated testing
- Have considered performance as the real dataset is much larger than the sample dataset
- TypeScript usage

## How we do this at Huggg

At Huggg we use TypeScript, Fastify, Typebox, Jest, Docker and others to build our services so feel free to use those technologies if you like but we're happy for you to approach this with whatever you are comfortable with.
