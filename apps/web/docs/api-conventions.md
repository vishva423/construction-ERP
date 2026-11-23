# API conventions

## Versioning
Public REST resources use URI versioning under `/api/v1`.

## Pagination and sorting
Collection endpoints accept `page` (one-based), `limit`, `sort`, and `order` (`asc` or `desc`).

## Error responses
Return the NestJS JSON error shape:

```json
{
  "statusCode": 400,
  "message": "Description",
  "error": "Bad Request"
}
```

## Tenant scoping
Every business table must carry `company_id`. Every query and mutation must be scoped to the authenticated user's company.

## Time storage
Store timestamps in UTC. Display dates and times in the company timezone, with `Asia/Kolkata` as the default.
