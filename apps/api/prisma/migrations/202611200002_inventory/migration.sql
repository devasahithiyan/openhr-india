CREATE UNIQUE INDEX "workforce_company_asset_tag" ON "WorkRecord" ("company_id", lower("payload"->'values'->>'assetTag')) WHERE "kind" = 'asset';

-- Import unambiguous equipment receipts from plans created before inventory existed.
WITH receipts AS (
 SELECT p.company_id,p."employeeId", e, count(*) OVER (PARTITION BY p.company_id,lower(e->>'asset')) AS occurrences
 FROM "OnboardingPlan" p CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.readiness->'equipment','[]')) e
 WHERE NULLIF(e->>'asset','') IS NOT NULL
), assets AS (SELECT *, gen_random_uuid() AS id FROM receipts WHERE occurrences=1)
INSERT INTO "WorkRecord" (company_id,id,kind,"employeeId",revision,payload)
SELECT company_id,id,'asset',"employeeId",1,jsonb_build_object('id',id,'kind','asset','employeeId',"employeeId",'assignedId',null,
'status','Assigned','revision',1,'values',jsonb_build_object('assetTag',e->>'asset','name',e->>'item','person',"employeeId"),
'history',jsonb_build_array(jsonb_build_object('action','Onboarding handover','actor',e->>'by','at',e->>'at','values',e)))
FROM assets ON CONFLICT DO NOTHING;
