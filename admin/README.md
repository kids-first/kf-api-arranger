# About

This section allows to create or update automatically an arranger project based on a configuration file. Moreover, it allows to fix elements in the extended mapping that arranger creates.

# Usage

The Law of the Land is: 1 arranger project per environment (qa, staging, prod). However, it is still possible to create more manually.

## Variables
- **ES_HOST**: Elastic search instance.
- **ES_USER**: (Optional) Elastic search user.
- **ES_PASS**: (Optional) Elastic search password.

### Steps

```bash
# 1. Make sure that targeted ES works (ES_HOST)
  
# 2. Run script (PWD =  root of the project)
  npm run admin-project
or 
 # run the script with docker (PWD = root of the project) 
docker run -it --network host --rm -v ${PWD}:/code --workdir /code node:16.13-alpine sh -c "npm install && npm run build && npm run admin-project" 
 # run the script with docker (PWD = root of the project) and local elastic search (from /dev) 
docker run -it --rm --network es-net -v ${PWD}:/code --workdir /code node:16.13-alpine sh -c "npm install && npm run build && npm run admin-project"
```

