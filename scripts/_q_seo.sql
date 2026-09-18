SELECT id, "siteName", COALESCE("defaultTitle",'') AS t, COALESCE("defaultDesc",'') AS d, COALESCE(email,'') AS e, COALESCE(phone,'') AS p FROM seo_config ORDER BY id LIMIT 3;
