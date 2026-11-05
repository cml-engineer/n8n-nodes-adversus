# API questions to resolve before publication

The following observations refer to the API specification supplied for this project. Notes marked **Live** come from manual tests on a live account (see VALIDATION.md). Official API documentation: https://solutions.adversus.io/api

1. Pagination says pageSize 1–100 but gives a default/example of 1000. This package explicitly requests at most 100. Confirm server behavior and metadata for every supported list resource.
2. Confirm actual shapes for contacts, leads, campaigns, pools and fields, both with and without includeMeta. This package accepts raw arrays, the resource array wrapper and single records with id. Unknown shapes fail explicitly. **Live:** Contact Get returned field values under `data` with numeric field IDs; Contact Get Many returned them under `fields` with field IDs as text. Leads, campaigns, pools and fields have worked with the current normalization, but their shapes are not fully documented.
3. Lead responses use lastModifiedTime while filters mention lastUpdatedTime. Confirm exact filter property names before adding guided date filters.
4. Confirm required properties for POST /leads and whether PUT /leads/{id} supports partial updates. The spec does not clearly define required lead fields. **Live:** Lead Create created both a contact and a campaign lead, and Lead Update with `active=false` was applied. This does not prove general partial updates: whether PUT leaves omitted properties unchanged is still unconfirmed.
5. Confirm safe handling of null and empty contact values.
6. Campaign addContact returns 201 and a Location header, without a documented JSON body. This release returns a local acknowledgement containing campaignId, contactId and added=true; it does not claim to return the new lead ID.
7. Import paths `/imports{id}/insert` and `/imports{id}/start` appear to omit a slash. Imports are excluded from this release.
8. Contact person create requires id in the schema but defines contactId. Contact person operations are excluded.
9. /cdr is deprecated. Any future call resource should use /calls and confirm supported filters; do not assume the old CDR filters exist there.
10. Verify rate-limit scope (organization/user), Retry-After headers and concurrency behavior with Adversus engineering.
11. Trigger development needs captured synthetic webhook payloads, registration/deletion tests, authKey validation and duplicate-delivery handling. No trigger node is included yet.
