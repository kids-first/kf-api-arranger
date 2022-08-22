# About

This section allows you to do 2 things:
1) spin up a local Elastic search (ES) and Kibana;
2) fetch data from a remote ES into your local ES instance if needed.

# Usage

## Variables
- **INDICES**: space-separated indices you want to fetch ```INDICES=index1 index2 index3``` .
- **SIZE**: Number of docs per indices you want to fetch (the same for every index).
- **URL_REMOTE_ES**: Url to remote ES instance. Use basic auth format.

## Files/Directory to have
- **es_data**: directory needed by ES. It must have the correct rights so that local ES can work.
- **.env-dev**: env file containing all the variables above.

*DO NOT COMMIT these files since they can contain secrets. Make sure they are listed in .gitignore*

### Steps

```bash
# 1. In a terminal, make sure that your PWD is in this directory.
  cd /dev # (assuming your were at the root of the project)
  
# 2. Create the file and directory needed for ES and the loading script.
  touch .env-dev #( write the variables into it)
  mkdir es_data && chown 1000:1000 -R es_data

# 3. Verify that your local ES is up.
  docker-compose up # (from this directory)
  
# 4  Run the script (it is interactive)
  ./load-remote-data.sh

# 5 When done developing do not forget to end the service.
  docker-compose down
```

Notes:
- step 2 and 4 are only needed when you start the project locally for the first time.
- If you need another container to communicate with ES (most likely with local arranger) than your ```ES_HOST``` should be ```ES_HOST=http://elasticsearch:9200``` vs ```ES_HOST=http://localhost:9200```. Doing so, minimises the need for containers to share the whole network with host.
- Sometimes it is necessary to use that option ```-e NODE_TLS_REJECT_UNAUTHORIZED=0``` with elasticdump if there are certificate issues. Like this: ```docker run --rm -ti --network=host -e NODE_TLS_REJECT_UNAUTHORIZED=0 elasticdump/elasticsearch-dump ...```. Beware that it may create security vulnerabilities.
