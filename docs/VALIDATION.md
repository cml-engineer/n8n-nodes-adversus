# Validation status

Official Adversus API documentation: https://solutions.adversus.io/api

This file separates three kinds of evidence: local automated checks, manual tests against a live Adversus account, and items that have not been verified yet. Passing these checks is not n8n verification.

## Local automated checks

Checked on 2026-11-05 using Node.js 24.22.2 and @n8n/node-cli 0.55.5.

| Check | Result |
| --- | --- |
| Official CLI project scaffold | Created using npm create @n8n/node with programmatic/example template; replaced example implementation |
| TypeScript build using npm run build | Passed |
| n8n strict lint using npm run lint | Passed with no errors or warnings |
| Local mocked tests using npm test | 22 passed, 0 failed |
| npm pack --dry-run | Passed; publication not attempted |
| npm publication / n8n verification | Not performed |

Mock tests cover response normalization, null/zero/false values, pagination and limit behavior, empty and repeated pages, invalid metadata, contact creation/update, duplicate field validation, lead PUT updates, campaign empty-body acknowledgement, projection/filter serialization, organization reads, bounded 429 retries, avoiding ambiguous write retries, credential test configuration and item linking. Error-handling tests cover:

- An API 404 ("Contact not found") stays a NodeApiError with HTTP status 404 and the item index.
- A non-numeric ID is rejected as a NodeOperationError before any API call.
- Continue On Fail with valid → invalid → valid input returns three linked items, where only the middle item is an error.
- Error output does not contain the Authorization header or credential values.

## Manual live tests

Performed manually by the maintainer on a local n8n 2.46.6 instance against a live Adversus account. Account-specific IDs and data are intentionally not recorded here.

| Area | Result |
| --- | --- |
| Operation coverage | All 15 implemented operations were executed against Adversus |
| Campaign Get Many | Limit 5 with Page Size 2 returned five unique campaigns. The number of HTTP requests was not observed directly |
| Contact Get Many | Works with an ID filter and with projection |
| Search without matches | Returns zero items without an error |
| Contact Update | Changes only the submitted field |
| Lead Create | Creates both a contact and a campaign lead; the contact fields were verified using Contact Get |
| Lead Update | `active=false` was verified using Lead Get. This does not prove that PUT leaves other, omitted lead fields unchanged |
| Invalid credentials | Live HTTP 401 confirmed manually |
| Unknown contact | Returns NodeApiError with HTTP 404 |
| Non-numeric ID | Rejected by the node |
| On Error: Continue | Valid → failing → valid input returns three items and continues after the error |
| Item linking | Verified from a downstream Code node for all three items |

### Observed response shapes

In the observed responses:

- **Contact Get** returns field values under `data`, keyed by numeric field IDs.
- **Contact Get Many** returns field values under `fields`, keyed by field IDs as text.

Synthetic illustration (not real data):

```jsonc
// Contact Get
{ "id": 1001, "data": { "11": "Example Name" } }
// Contact Get Many (with projection)
{ "id": "1001", "fields": { "11": "Example Name" } }
```

The node passes these shapes through unchanged. Workflows that combine Get and Get Many output must handle both.

## Dependency audit

Last observed (2026-11-05, not re-run for this update): `npm audit` reported 43 findings in total and `npm audit --omit=dev` reported 3 high findings. All three are in `n8n-workflow` → `@n8n/expression-runtime` → `zod@3.25.76` (GHSA-mrhx-c7xc-m3w5, fixed only in zod 4.6.6). Every published n8n-workflow version pins zod 3.25.76 exactly, so no compatible fix was available. This is unresolved. The package has no runtime dependencies; `n8n-workflow` is a peer dependency provided by n8n.

## Packed package installation

### A. n8n installer method (peer dependencies stripped)

Checked on 2026-11-05: the `npm pack` tarball (`n8n-nodes-adversus-0.1.0.tgz`, 16 files, `private: true` kept) was installed into a separate n8n 2.46.6 instance with its own user folder, SQLite database and ports (5680 for the editor, 5681 for the task runner broker; 5679 was already used by the development instance's task runner broker). No development link, symlink, `N8N_CUSTOM_EXTENSIONS` or project source path was used, and no credentials were copied. No Adversus requests were made.

The installation followed what n8n 2.46.6's own community package installer does: the tarball is unpacked to `<user folder>/.n8n/nodes/node_modules/n8n-nodes-adversus`, `peerDependencies`, `devDependencies` and `optionalDependencies` are removed from its package.json, and `npm install --ignore-scripts --install-strategy=shallow --package-lock=false` is run in the package folder.

#### Verified automatically

| Check | Result |
| --- | --- |
| Package dependencies installed | None. The package has no runtime dependencies, and the n8n installer strips the `n8n-workflow` peer dependency |
| `n8n-workflow` used at runtime | n8n's own copy, 2.46.5 (resolved through n8n's module paths) |
| Startup log | "Loaded all credentials and nodes from n8n-nodes-adversus" (1 node, 1 credential); no load errors |
| Node type | `n8n-nodes-adversus.adversus` registered; n8n also generates the AI tool variant `n8n-nodes-adversus.adversusTool` because of `usableAsTool` |
| Credential type | `adversusApi` ("Adversus API"), linked to the node |
| Documentation link in registered types | Node `primaryDocumentation` and credential `documentationUrl` are both https://solutions.adversus.io/api |
| Icon URL | `icons/n8n-nodes-adversus/dist/nodes/Adversus/adversus.svg` for light and dark mode (loaded from the package, not from `CUSTOM`) |
| Source isolation | The running process had no open files in the project source folder |

A plain `npm install` of the tarball, without stripping peers, would instead install `n8n-workflow@2.16.0` (npm's `latest` tag) with `zod@3.25.67` and about 90 other packages. That copy would not match the running n8n version. This was only checked with `--dry-run`.

#### Checked manually in the browser (instance A, dark mode)

This instance runs the tarball built before the action labels were corrected, so it still showed labels such as "Get many campaign".

- [x] Adversus is shown as installed, with 15 actions.
- [x] The official logo is shown in the node panel, on the canvas and in the credential dialog in dark mode.
- [ ] The logo in light mode (not checked).
- [x] The node's documentation link opens https://solutions.adversus.io/api.
- [x] The Adversus API credential dialog shows Username and Password.
- [ ] Masking of a typed password in the dialog (not checked manually; the field is registered with `typeOptions.password: true`).

### B. Unmodified tarball with plain npm install (peer dependencies included)

Checked on 2026-11-05 with a new tarball that includes the corrected action labels. The tarball was not modified. It was installed into a new, separate n8n 2.46.6 instance (own user folder, SQLite database and encryption key; editor port 5682, task runner broker port 5683) with:

```sh
cd <user folder>/.n8n/nodes
npm install <path>/n8n-nodes-adversus-0.1.0.tgz --ignore-scripts
```

No symlinks to the source, `npm link`, `npm run dev` or custom extension paths were used; the only symlinks are npm's own `node_modules/.bin` entries.

| Check | Result |
| --- | --- |
| Installation | Succeeded. npm added 94 packages without reporting peer conflicts |
| Peer dependency installed | `n8n-workflow@2.16.0` (npm's `latest` tag for `"*"`), with `@n8n/expression-runtime@0.8.0` and `zod@3.25.67` |
| Host n8n-workflow | 2.46.5 |
| What the node resolves at runtime | Its own `nodes/node_modules/n8n-workflow` 2.16.0, not the host's 2.46.5. Local `node_modules` takes precedence over n8n's NODE_PATH |
| Loading | "Loaded all credentials and nodes from n8n-nodes-adversus" (1 node, 1 credential); no load errors |
| Node type | `n8n-nodes-adversus.adversus` (plus the generated `adversusTool`) with the 15 corrected action labels |
| Credential type | `adversusApi`; Username and Password (`password: true`); documentation link https://solutions.adversus.io/api |

#### Runtime compatibility (offline probe, no network)

The installed node module was loaded with n8n's module resolution, and `execute()` was run with a mocked request helper that throws the host's NodeApiError, as n8n-core does. Results:

| Case | Installer method (A) | Plain npm install (B) |
| --- | --- | --- |
| n8n-workflow used by the node | Host 2.46.5 (same module instance) | Own 2.16.0 (different module instance) |
| API 404 | NodeApiError, HTTP 404, "Contact not found", item index 0; instance of host classes | Same fields, but **not** an instance of the host's NodeApiError |
| Non-numeric ID | NodeOperationError, instance of host class | NodeOperationError, **not** an instance of the host class |

Loading alone does not prove runtime compatibility. With method B, n8n 2.46.6 core uses `instanceof` checks against its own `n8n-workflow`. For example, `WorkflowExecute.buildErrorReport` sends errors that are not instances of its own `BaseError` to the error reporter as unknown errors, even for ordinary 404 warnings. Other mismatches between 2.16.0 and 2.46.5 have not been tested. No workflow was executed in instance B, and no Adversus requests were made.

**Recommendation:** keep `n8n-workflow` as a `"*"` peer dependency. This is the standard for n8n community nodes, and the n8n installer strips peers. Install manually with `--omit=peer` (verified in C below), or through Settings > Community Nodes. No dependency change was made.

### C. Unmodified tarball with npm install --omit=peer (instance B reinstalled)

Checked on 2026-11-05 in the same instance B (ports 5682/5683). Only instance B was stopped; its database, encryption key and user setup were kept. The previous `package.json` and `package-lock.json` of its nodes folder were backed up, then `node_modules` and the lockfile were removed. The same unmodified tarball as in B (SHA-256 `f049371a…c2fd95`) was installed with:

```sh
cd <user folder>/.n8n/nodes
npm install /absolute/path/to/n8n-nodes-adversus-0.1.0.tgz --ignore-scripts --omit=peer
```

| Check | Result |
| --- | --- |
| Installation | Passed. "added 1 package"; `node_modules` contains only `n8n-nodes-adversus` |
| Local `n8n-workflow` installed | No |
| What the node resolves at runtime | The host's `n8n-workflow` 2.46.5 (through n8n's NODE_PATH) |
| `NodeApiError` / `NodeOperationError` | The same class objects as the host's |
| Loading after restart | "Loaded all credentials and nodes from n8n-nodes-adversus" (1 node, 1 credential); no load errors. The type cache was regenerated for this check |
| Node type | `n8n-nodes-adversus.adversus` with 15 actions (plus the generated `adversusTool`); documentation link https://solutions.adversus.io/api |
| Credential type | `adversusApi`; Password registered with `password: true`; documentation link https://solutions.adversus.io/api |

Offline probe (mocked request helper throwing the host's NodeApiError; no network):

| Case | Result |
| --- | --- |
| API 404 | NodeApiError; `instanceof` host NodeApiError: **true**; httpCode 404; description "Contact not found"; item index 0 |
| Non-numeric ID | NodeOperationError; `instanceof` host NodeOperationError: **true**; item index 0; no request |
| `__CUSTOM_API_CALL__` | NodeOperationError "Unsupported resource or operation"; `instanceof` host class: **true** |

Notes:

- With `--omit=peer`, `package-lock.json` in the nodes folder still records the peer tree (marked `peer: true`, including `n8n-workflow@2.16.0`), but it is not installed. Later `npm install` or `npm ci` runs in that folder must also use `--omit=peer`, or the peer is installed again.
- `npm ls` in the nodes folder reports `UNMET DEPENDENCY n8n-workflow@*`. This is expected, because n8n provides the module.
- No workflow was executed in the editor; runtime behavior was checked with the offline probe only.

## Custom API Call

Investigated in the n8n 2.46.6 source and in the registered node types; not clicked through in the UI.

- **Why it is added:** `LoadNodesAndCredentials.injectCustomApiCallOptions()` adds a "Custom API Call" option (`__CUSTOM_API_CALL__`) to every `resource` and `operation` list of nodes whose credential supports proxy authentication. `adversusApi` qualifies because it defines `authenticate`. It is added by n8n, not by this package (6 entries: one per operation list).
- **What the editor does:** the node creator hides it from the action list and shows "Make a custom Adversus API call" instead, which adds an HTTP Request node. When the option is selected inside the node, the editor shows "Use the HTTP Request node to make a custom API call. We'll take care of the Adversus auth for you" with a link to n8n's custom operations documentation.
- **If it is executed anyway:** it reaches this node's `execute()`, which rejects it as "Unsupported resource or operation" (NodeOperationError, item index 0; verified with the offline probe). No request is sent.
- **Credentials:** the HTTP Request node uses the `adversusApi` credential as a predefined credential type. n8n adds "Allowed HTTP Request Domains" (default **All**) and "Allowed Domains" to such credentials. Users should restrict the credential to `api.adversus.io` so the Basic Auth credentials cannot be sent to other domains.
- **Node changes required:** none. This is standard n8n behavior for nodes with these credentials. No endpoint or generic proxy was added.

## n8n package scanner (static analysis only)

Checked on 2026-11-05 with `@n8n/scan-community-package` 0.42.0. Its CLI only scans published packages, because it first checks npm provenance and downloads the attested GitHub commit. Those two steps have not run. The static-analysis step was run locally through the package's exported `analyzePackage()`, with the scanner's own ESLint configuration and file patterns:

| Target | Files | Result |
| --- | --- | --- |
| Committed source (`git archive` of commit 081a784) | package.json, nodes/, credentials/ | Passed, no findings |
| Fresh `npm pack` tarball | compiled `.js` files, package.json | Passed, no findings |

A negative control (an added `console.log`) was reported, so the clean result is not an empty scan.

## Not verified yet

- Live HTTP 429 responses and the retry/Retry-After behavior (only covered by mock tests). Rate limits are deliberately not provoked against the live account.
- Parallel load, concurrent workflows and the shared API rate limit.
- HTTP 403 responses (401 has been confirmed).
- Partial updates of lead fields other than `active`.
- Return All with more than 100 records across many pages.
- The logo in light mode, and masking of a typed password.
- Running a workflow in an instance installed with plain npm install (method B).
- Custom API Call through the editor UI (HTTP Request node with the Adversus credential).
- Installing from the npm registry, or through Settings > Community Nodes (the package is not published).
- The full n8n community package scanner (provenance and attested-source steps need a published package).

The open API questions are in API-QUESTIONS.md, and the remaining publication steps are in VERIFICATION.md.
