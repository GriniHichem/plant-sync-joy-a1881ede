DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tickets',
    'preventive_plans',
    'preventive_plan_assignees',
    'preventive_executions',
    'pdr_requests',
    'pdr_request_items',
    'pdr_maintenance_holdings',
    'pdr_stock_movements',
    'maintenance_shifts'
  ]
  LOOP
    -- REPLICA IDENTITY FULL so UPDATE/DELETE payloads carry old row data for filters
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    -- Add to realtime publication if not already a member
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;