\pset pager off
\pset format unaligned
\pset fieldsep '|||'
SELECT id, slug, content::text FROM about_sections ORDER BY id;
