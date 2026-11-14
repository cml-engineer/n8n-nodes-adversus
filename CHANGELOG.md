<!-- auto-changelog-above -->

## Release notes

Everything above the `auto-changelog-above` marker is generated from git history by `npm run release`. The notes below are maintained by hand and kept on every release.

### 0.1.1

First public release on npm, published from GitHub Actions with npm provenance.

- Use the official Adversus logo for light and dark mode.
- Link the node and credential to the official API documentation (https://solutions.adversus.io/api).
- API errors keep their NodeApiError type and HTTP status; input validation errors use NodeOperationError.
- Correct action labels, for example "Get many contacts" and "Add contact to campaign". Internal operation values are unchanged.
- Document manual live test results in docs/VALIDATION.md.
- Document packed package installation tests and Custom API Call behavior.
- Publish workflow follows the official n8n release flow: version tags trigger `npm run release` with provenance, NPM_TOKEN for the first release and Trusted Publishing afterwards.
- Remove the temporary `private` flag from package.json.

### 0.1.0

Initial development release: contacts, leads, campaigns, pools, fields and organization; Basic Auth credentials; sequential pagination and local mock tests. Not published or verified.
