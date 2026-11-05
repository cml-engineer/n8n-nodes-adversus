# Changelog

## Unreleased

- Use the official Adversus logo for light and dark mode.
- Link the node and credential to the official API documentation (https://solutions.adversus.io/api).
- API errors keep their NodeApiError type and HTTP status; input validation errors use NodeOperationError.
- Correct action labels, for example "Get many contacts" and "Add contact to campaign". Internal operation values are unchanged.
- Document manual live test results in docs/VALIDATION.md.
- Document packed package installation tests and Custom API Call behavior.

## 0.1.0

Initial development release: contacts, leads, campaigns, pools, fields and organization; Basic Auth credentials; sequential pagination and local mock tests. Not published or verified.
