<p align="center">
  <img src="docs/kids_first_logo.svg" alt="Kids First repository logo" width="660px" />
</p>
<p align="center">
  <a href="https://github.com/kids-first/kf-template-repo/blob/master/LICENSE"><img src="https://img.shields.io/github/license/kids-first/kf-template-repo.svg?style=for-the-badge"></a>
</p>

# :factory: KF-API-ARRANGER
This is an instantiation of the [@arranger/server](https://github.com/overture-stack/arranger/tree/develop/modules/server) application for the Kids First portal, with an integration with [Ego](https://github.com/overture-stack/ego) for authentication.

Arranger server is an application that wraps Elasticsearch and provides a GraphQL search API for consumption by the [Kids First Portal UI](https://github.com/kids-first/kf-portal-ui).

## Development:

### General
* Make sure that all the needed env vars point to where they should.
* When adding a new env var, update the .env.example. Otherwise, an error will be thrown.
* Installing dependencies: `npm install`

### Docker (local elasticsearch & kibana)
In the `/docker` folder:
* Create, if non-existent, a folder `esdata` containing your elasticsearch data.
* Run the `launch.sh` script that will start an elasticsearch and a kibana container.
* To stop and remove these containers: `teardown.sh`
  
In the `root` folder:  
* Make sure that the env vars point to these containers.
* start the app in dev mode `npm run dev`

### Build (Locally) 
In the `root` folder:
* launch the build `npm run build`
* execute `node /dist/index.js`

### Build (Docker)
In the `root` folder:
* Build the container: `docker build -t whateverName .`
* Execute: `docker run whateverName`
* Do not forget to stop or delete if needed the container and its image.
### Tests
* Execute: `npm run test`
