export DATA_DIRECTORY="./esdata";

#if ES not already running
if [ -z `docker-compose ps -q elasticsearch` ] || [ -z `docker ps -q --no-trunc | grep $(docker-compose ps -q elasticsearch)` ]; then
    docker-compose up -d --remove-orphans;

    i=15
    status=`curl --silent --fail http://localhost:9200/`

    echo "Waiting for ElasticSearch to boot.  Timeout: $i seconds."

    while [ -z "$status" ] && [ $i -gt 0 ]
    do
      i=$((i-1))
      sleep 1
      status=`curl --silent --fail http://localhost:9200/`
    done

    [ -z "$status" ] && (echo "ElasticSearch failed to start!"; exit 1;)
fi