<p align="center">
  <img src="docs/kids_first_logo.svg" alt="Kids First repository logo" width="660px" />
</p>
<p align="center">
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=for-the-badge"></a>
</p>

# :factory: KF-API-ARRANGER
This is an instantiation of the [@arranger/server](https://github.com/overture-stack/arranger/tree/develop/modules/server) application for the Kids First portal, with an integration with [Ego](https://github.com/overture-stack/ego) for authentication.

Arranger server is an application that wraps Elasticsearch and provides a GraphQL search API for consumption by the [Kids First Portal UI](https://github.com/kids-first/kf-portal-ui).

## Development:


### General
* Make sure that all the needed env vars point to where they should.
* When adding a new env var, update the .env.example. Otherwise, an error will be thrown.
* Installing dependencies: `npm install`

### Test
* Execute: `npm run test`
