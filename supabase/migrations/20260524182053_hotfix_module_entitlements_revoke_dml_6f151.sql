REVOKE INSERT, UPDATE, DELETE ON public.platform_modules FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.store_module_access FROM authenticated;

GRANT SELECT ON public.platform_modules TO authenticated;
GRANT SELECT ON public.store_module_access TO authenticated;;
