INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete)
SELECT role, 'journal_stock', can_view, false, false, false
FROM public.role_permissions
WHERE module = 'shift_magasin'
ON CONFLICT (role, module) DO NOTHING;