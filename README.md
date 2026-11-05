# n8n-nodes-adversus

An Adversus integration for n8n. Development version 0.1.0; not published or verified by n8n.

## Supported operations

| Resource | Operations |
| --- | --- |
| Contact | Create, Get, Get Many, Update |
| Lead | Create, Get, Get Many, Update |
| Campaign | Get, Get Many, Add Contact |
| Pool | Get, Get Many |
| Field | Get Many |
| Organization | Get |

Contacts are records in pools. Leads are campaign-associated records. Their IDs are not interchangeable. The same contact may be associated with more than one campaign.

## Local development in VS Code

1. Clone the repository (`git clone https://github.com/cml-engineer/n8n-nodes-adversus.git`) and open the `n8n-nodes-adversus` folder using **File > Open Folder**.
2. Install Node.js 22.16 or later (Node.js 24 LTS recommended).
3. Open **Terminal > New Terminal** in VS Code.
4. Run:

```sh
npm ci
npm run build
npm test
npm run lint
npm run dev
```

Open the local address printed by the development command (normally http://localhost:5678). Create a local n8n account if prompted. This runs a local development instance; it does not connect to or change your existing hosted n8n instance. If port 5678 is already occupied, stop the other local development instance before starting.

Add a Manual Trigger and an Adversus node. Select **Organization > Get**, create Adversus API credentials, and execute. The expected response contains the connected organization ID and name. An example workflow is in `examples/organization-test.json`; install/load this node first, then import the example.

## Installing a packed or published package

Install through **Settings > Community Nodes** where possible. For a manual installation, install into n8n's nodes folder (`~/.n8n/nodes`, or `<N8N_USER_FOLDER>/.n8n/nodes`) without the `n8n-workflow` peer dependency, then restart n8n. Tested with a local tarball on n8n 2.46.6:

```sh
cd ~/.n8n/nodes
npm install /absolute/path/to/n8n-nodes-adversus-0.1.0.tgz --ignore-scripts --omit=peer
```

With `--omit=peer`, only this package is installed, and the node uses the `n8n-workflow` that n8n itself runs. A plain `npm install` also installs its own copy of `n8n-workflow` (npm's `latest` tag), which can differ from n8n's version; then n8n does not recognize the node's errors as its own error classes. Use `--omit=peer` for every later `npm install` or `npm ci` in that folder as well. Installing the published package from the npm registry has not been tested yet. See `docs/VALIDATION.md`.

## Credentials

Official Adversus API documentation: https://solutions.adversus.io/api

Use your Adversus API user's username and password. Authentication uses HTTP Basic Auth over HTTPS against `https://api.adversus.io/v1`. Credentials are stored by n8n, never in this package. The connection test calls `GET /organization`. Your API user needs permissions for each resource you use.

n8n adds a **Custom API Call** option to the node. It opens an HTTP Request node that uses these credentials; it is not handled by this node. n8n also adds **Allowed HTTP Request Domains** to the credential (default: All). Restrict it to `api.adversus.io` so the credentials cannot be sent to other domains.

## Contacts and dynamic fields

Create: choose a pool, then choose contact fields and enter values. In **JSON** mode provide a field ID to value object, for example `{"42":"Alice","43":false}`. Do not wrap this in a `data` property; the node supplies that wrapper. Field IDs, pool IDs and campaign IDs are loaded from your own account. Dropdowns also accept IDs through expressions. Field mode sends strings; JSON mode preserves numbers, booleans, zero and null. The API determines whether a null/empty value clears data; validate that behavior in your test account before using it.

For contact **Get Many**, add **Options > Projection** containing comma-separated field IDs if you need field data. Without projection the API may return IDs only. The output is passed through as the API returns it: in observed responses, contact **Get** returns field values under `data` with numeric field IDs, while **Get Many** returns them under `fields` with field IDs as text. Each record becomes one n8n item. No automatic detail request is made for every ID.

## Leads

Lead **Create** takes a campaign and a JSON object with the documented lead properties. Example:

```json
{"poolId":12,"status":"new","masterData":[{"id":42,"value":"Alice"}]}
```

The campaign ID selected in the node is applied to the request. Lead **Update** sends PUT with the JSON properties provided; test the API's partial-update behavior before using this operation on production records. Additional properties are not guessed or filled automatically.

## Pagination and request limits

Get Many supports Return All or Limit, JSON filters and Page Size (1–100). Pages run sequentially, using `includeMeta=true`. The node follows `meta.pagination.pageCount` when available, otherwise stops at an empty/short page. It rejects consecutive repeated pages and stops with an error after 10,000 pages. Return All accumulates results in memory; use a limit and selective filters for large accounts. Pagination is not a consistent database snapshot: concurrent API updates can affect pages.

The supplied API specification states 1,000 requests/hour, 60/minute and maximum 2 concurrent requests. The default interval is 3,700 ms between pages and between input items. The interval option applies to pages; the inter-item interval is fixed at 3,700 ms. The quota is shared with other workflows/clients: this package does not enforce an organization-wide distributed limit. Dropdown and credential requests also consume quota. Configure workflow concurrency accordingly.

HTTP 429 retries at most three times, respecting Retry-After up to 180 seconds (longer waits are surfaced as errors). Other failures are not automatically retried. In particular, writes are not retried following network/5xx failures because the server may already have applied them. Verify the result before replaying a create request. A failed multi-page read does not return partial results for that input item. API errors are reported as NodeApiError with the HTTP status (for example 404 for an unknown contact); invalid input such as a non-numeric ID is rejected before any request. Continue On Fail produces an error item with item linking and continues with the next item.

## Development and publication

- `npm run build`: compile and copy assets using the official n8n node CLI.
- `npm run lint`: n8n strict lint rules.
- `npm test`: build and run local mock tests; no Adversus credentials needed.
- `npm run dev`: local n8n development instance with hot reload.
- `npm pack --dry-run`: inspect package contents without publishing.

Programmatic style centralizes mixed ID/object responses and controls pagination, pacing and retry handling. There are no runtime dependencies, environment variable reads or filesystem operations in node execution. Test fixtures contain synthetic data only.

The maintainer is Christian Lund, and the source repository is https://github.com/cml-engineer/n8n-nodes-adversus (report issues at https://github.com/cml-engineer/n8n-nodes-adversus/issues). Check npm name availability before publishing; it has not been reserved. The node and credential link to the official API documentation at https://solutions.adversus.io/api. The node and credential use the official Adversus logo at `nodes/Adversus/adversus.svg` for both light and dark mode.

The GitHub publish workflow is manual-only and must be enabled deliberately after completing `docs/VERIFICATION.md`. Nothing is published by opening, installing or building the project. Do not run a release command until ownership, npm authentication and live validation are complete.

## Compatibility and status

Based on the supplied Adversus Swagger 2.0 specification, API version 1.2.1. All 15 operations have been tested manually against a live Adversus account on n8n 2.46.6; the packed npm package loads in a separate n8n 2.46.6 instance. Live rate-limit (429) behavior, parallel load, the packed package in the editor UI and installation from the npm registry have not been verified yet. See `docs/VALIDATION.md` for actual checks performed and `docs/API-QUESTIONS.md` for specification inconsistencies. Intended for n8n 2.x; compatibility with your exact server version requires a local import/execution test. No trigger node is included in this release.

## License

MIT. See LICENSE.
