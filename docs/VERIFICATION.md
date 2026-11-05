# Before requesting n8n verification

- [ ] Confirm that an equivalent existing node does not require a contribution instead.
- [x] Set the package maintainer and GitHub repository in package.json (Christian Lund; https://github.com/cml-engineer/n8n-nodes-adversus).
- [ ] Confirm that the npm package name `n8n-nodes-adversus` is available.
- [x] Replace the temporary icon with an approved Adversus asset (`nodes/Adversus/adversus.svg`, used for light and dark mode).
- [x] Set the API documentation URL (https://solutions.adversus.io/api) in credential and node metadata.
- [ ] Publish the README in the public repository (the repository URL is set in package.json).
- [ ] Resolve the supported-operation questions in API-QUESTIONS.md against live test data.
- [x] Run all 15 supported operations against Adversus, including 404 (NodeApiError) and empty results. See VALIDATION.md.
- [ ] Test live 401, 403 and 429 responses, including Retry-After handling.
- [x] Test multiple input items, projection, ID filters, Continue On Fail and item linking.
- [ ] Test Return All with more than 100 records, dropdown expressions and parallel load against the shared rate limit.
- [ ] Verify partial-update semantics for Lead Update (only `active=false` has been verified) and required fields for Lead Create.
- [x] Install the packed npm package in a separate n8n 2.46.6 instance and confirm that the node and credential types load (automated check; see VALIDATION.md).
- [x] Check the installed package in the editor UI (dark mode): node panel with 15 actions, logo, documentation link and credential dialog fields.
- [ ] Check the logo in light mode and masking of a typed password.
- [x] Install the unmodified tarball with plain `npm install` and confirm the node and credential types load (see VALIDATION.md).
- [x] Document manual installation with `--omit=peer` (verified with the unmodified tarball on n8n 2.46.6: host `n8n-workflow` and error classes are used; see VALIDATION.md).
- [ ] Recommend restricting the Adversus credential's Allowed HTTP Request Domains to `api.adversus.io` (Custom API Call / HTTP Request).
- [ ] Install from the npm registry and through Settings > Community Nodes once published.
- [ ] Run npm ci, npm run lint, npm test and npm pack --dry-run.
- [ ] Run the current n8n community package scanner and resolve findings.
- [ ] Resolve or document the dependency audit findings (3 high via n8n-workflow → zod; see VALIDATION.md).
- [ ] Keep MIT license, English UI/docs, no runtime dependencies, no environment-variable or filesystem access.
- [ ] Push the first commit to https://github.com/cml-engineer/n8n-nodes-adversus and make the repository public.
- [ ] Configure npm Trusted Publishing for GitHub Actions and publish.yml. Follow npm's current first-publication instructions if the package does not exist yet.
- [ ] After all gates pass, remove the temporary private=true flag, commit the change and deliberately run the manual Publish workflow with the matching package version.
- [ ] Confirm that the npm version has provenance and correct author/repository metadata.
- [ ] Submit the published package through https://creators.n8n.io/nodes and respond to review feedback.

Official references:
- https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines.md
- https://docs.n8n.io/connect/create-nodes/build-your-node/using-the-n8n-node-tool.md
- https://docs.n8n.io/integrations/community-nodes/building-community-nodes.md

Passing local checks is not n8n verification. Publication and approval are separate steps.
