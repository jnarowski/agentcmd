-- Data migration: Rename workflow_id to workflow_definition_id in webhook config JSON
-- This updates all workflow_id fields in the mappings array and default_mapping object

-- Update each webhook's config JSON by replacing "workflow_id" keys with "workflow_definition_id"
UPDATE webhooks
SET config = json_replace(
  config,
  '$.mappings',
  (
    SELECT json_group_array(
      json_set(
        value,
        '$.workflow_definition_id', json_extract(value, '$.workflow_id')
      )
    )
    FROM json_each(json_extract(config, '$.mappings'))
  )
)
WHERE json_extract(config, '$.mappings') IS NOT NULL;

-- Remove old workflow_id fields from mappings
UPDATE webhooks
SET config = json_replace(
  config,
  '$.mappings',
  (
    SELECT json_group_array(
      json_remove(value, '$.workflow_id')
    )
    FROM json_each(json_extract(config, '$.mappings'))
  )
)
WHERE json_extract(config, '$.mappings') IS NOT NULL;

-- Update default_mapping if it exists
UPDATE webhooks
SET config = json_set(
  json_remove(config, '$.default_mapping.workflow_id'),
  '$.default_mapping.workflow_definition_id',
  json_extract(config, '$.default_mapping.workflow_id')
)
WHERE json_extract(config, '$.default_mapping.workflow_id') IS NOT NULL;
