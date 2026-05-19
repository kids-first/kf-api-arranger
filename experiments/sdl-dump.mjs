import { buildClientSchema, getIntrospectionQuery, printSchema } from 'graphql';

const url = process.env.ARRANGER_URL ?? 'http://localhost:5050/include/graphql';
const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: getIntrospectionQuery() }),
});
const json = await r.json();
if (json.errors) {
    console.error(JSON.stringify(json.errors, null, 2));
    process.exit(1);
}
process.stdout.write(printSchema(buildClientSchema(json.data)));
