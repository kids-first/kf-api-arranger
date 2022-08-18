#!/bin/bash

trap - SIGINT

readonly FILE_ENV=".env-dev"

if [ ! -f "$FILE_ENV" ]; then
  echo "You must provide a file named '$FILE_ENV' for environment variables"
  exit 1
fi

if [ ! -d es_data ]; then
  echo "Creating folder es_data for local elasticsearch"
  mkdir es_data && chown 1000:1000 -R es_data
fi

# shellcheck source=src/.env-dev
source $FILE_ENV

export INDICES
export SIZE
export URL_REMOTE_ES

read -r -a INDICES_TO_IMPORT <<<"$INDICES"

docker pull elasticdump/elasticsearch-dump

for ES_INDEX in "${INDICES_TO_IMPORT[@]}"; do
   read -r -p "=====> About to copy: $ES_INDEX. Do you want to proceed?" yn
      case $yn in
          [Yy]* ) ;;
          * ) exit 0;;
      esac

  echo '### about to fetch mapping ###'
  docker run --rm -ti --network=host elasticdump/elasticsearch-dump \
    --input="$URL_REMOTE_ES"/"$ES_INDEX" \
    --output=http://localhost:9200/"$ES_INDEX" \
    --size="$SIZE" \
    --type=mapping

  echo '### about to fetch data ###'
  docker run --rm -ti --network=host elasticdump/elasticsearch-dump \
    --input="$URL_REMOTE_ES"/"$ES_INDEX" \
    --output=http://localhost:9200/"$ES_INDEX" \
    --size="$SIZE" \
    --type=data
done
