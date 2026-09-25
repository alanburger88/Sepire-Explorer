import { API_BASE } from './config';

export type SnippetLang = 'curl' | 'node' | 'python' | 'csharp' | 'java';

export const SNIPPET_LANGS: Array<{ id: SnippetLang; label: string }> = [
  { id: 'curl', label: 'cURL' },
  { id: 'node', label: 'Node.js' },
  { id: 'python', label: 'Python' },
  { id: 'csharp', label: 'C#' },
  { id: 'java', label: 'Java' },
];

const REST_URL = `${API_BASE}/v1/statements`;
const GQL_URL = `${API_BASE}/graphql`;

export function restSnippet(lang: SnippetLang, validateOnly = false): string {
  const url = validateOnly ? `${REST_URL}/validate` : REST_URL;
  switch (lang) {
    case 'curl':
      return `curl -X POST ${url} \\
  -H "Authorization: Bearer $SEPIRE_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  --data @statement.json`;
    case 'node':
      return `import { readFile } from 'node:fs/promises';

const res = await fetch('${url}', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.SEPIRE_TOKEN}\`,
    'Content-Type': 'application/json',
    'Idempotency-Key': crypto.randomUUID(),
  },
  body: await readFile('statement.json'),
});

const result = await res.json();
if (res.status === 422) console.error(result.errors);   // every problem, with its JSON path
else console.log(result.statementId, result.links.statement);`;
    case 'python':
      return `import json, os, uuid
import requests

with open("statement.json") as f:
    payload = json.load(f)

res = requests.post(
    "${url}",
    json=payload,
    headers={
        "Authorization": f"Bearer {os.environ['SEPIRE_TOKEN']}",
        "Idempotency-Key": str(uuid.uuid4()),
    },
    timeout=30,
)

if res.status_code == 422:
    print(res.json()["errors"])      # every problem, with its JSON path
else:
    res.raise_for_status()
    print(res.json()["links"]["statement"])`;
    case 'csharp':
      return `using System.Net.Http.Headers;
using System.Text;

using var http = new HttpClient();
http.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", Environment.GetEnvironmentVariable("SEPIRE_TOKEN"));

var request = new HttpRequestMessage(HttpMethod.Post, "${url}")
{
    Content = new StringContent(File.ReadAllText("statement.json"), Encoding.UTF8, "application/json"),
};
request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());

var response = await http.SendAsync(request);
Console.WriteLine($"{(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");`;
    case 'java':
      return `var client = HttpClient.newHttpClient();

var request = HttpRequest.newBuilder(URI.create("${url}"))
    .header("Authorization", "Bearer " + System.getenv("SEPIRE_TOKEN"))
    .header("Content-Type", "application/json")
    .header("Idempotency-Key", UUID.randomUUID().toString())
    .POST(HttpRequest.BodyPublishers.ofFile(Path.of("statement.json")))
    .build();

var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.statusCode() + " " + response.body());`;
  }
}

export function graphqlSnippet(lang: SnippetLang, query: string): string {
  const q = query.trim();
  switch (lang) {
    case 'curl':
      return `# statement.json holds the payload; jq wraps it as the $input variable.
jq -n --slurpfile input statement.json --rawfile query operation.graphql \\
  '{query: $query, variables: {input: $input[0]}}' |
curl -X POST ${GQL_URL} \\
  -H "Authorization: Bearer $SEPIRE_TOKEN" \\
  -H "Content-Type: application/json" \\
  --data @-`;
    case 'node':
      return `import { readFile } from 'node:fs/promises';

const query = \`
${indent(q, '')}\`;

const input = JSON.parse(await readFile('statement.json', 'utf8'));
const res = await fetch('${GQL_URL}', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.SEPIRE_TOKEN}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query, variables: { input } }),
});

const { data, errors } = await res.json();
console.log(errors ?? data);`;
    case 'python':
      return `import json, os
import requests

QUERY = """
${q}
"""

with open("statement.json") as f:
    payload = json.load(f)

res = requests.post(
    "${GQL_URL}",
    json={"query": QUERY, "variables": {"input": payload}},
    headers={"Authorization": f"Bearer {os.environ['SEPIRE_TOKEN']}"},
    timeout=30,
)
body = res.json()
print(body.get("errors") or body["data"])`;
    case 'csharp':
      return `using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

var query = """
${q}
""";

var input = JsonNode.Parse(File.ReadAllText("statement.json"));
var body = new JsonObject { ["query"] = query, ["variables"] = new JsonObject { ["input"] = input } };

using var http = new HttpClient();
http.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", Environment.GetEnvironmentVariable("SEPIRE_TOKEN"));
var response = await http.PostAsync("${GQL_URL}",
    new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json"));
Console.WriteLine(await response.Content.ReadAsStringAsync());`;
    case 'java':
      return `var query = """
${q}
""";
var input = Files.readString(Path.of("statement.json"));
var body = "{\\"query\\":" + new ObjectMapper().writeValueAsString(query)
    + ",\\"variables\\":{\\"input\\":" + input + "}}";

var request = HttpRequest.newBuilder(URI.create("${GQL_URL}"))
    .header("Authorization", "Bearer " + System.getenv("SEPIRE_TOKEN"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(body))
    .build();

var response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());`;
  }
}

function indent(text: string, pad: string): string {
  return text
    .split('\n')
    .map((l) => pad + l)
    .join('\n');
}
