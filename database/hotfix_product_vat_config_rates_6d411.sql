/*
  ============================================================================
  HOTFIX: Product VAT Config Rate Alignment — Etapa 6D.4.1.1
  Proiect: Gestiune Magazin v2
  Scop:
  - Modifică funcția `public.merge_store_settings_with_defaults` pentru a
    garanta că ratele grupelor de TVA A-E sunt forțate la standardul curent
    din România (A=21, B=11, C=11, D=0, E=0) și nu sunt suprascise de
    date legacy sau setări custom din frontend.
  - Păstrează configurabilitatea pentru `default_vat_group`, `vat_payer`,
    `price_tax_policy` și valorile de `label`/`active` din input.
  - Nu modifică date în tabele.
  - Nu rulează backfill.
  ============================================================================
*/

CREATE OR REPLACE FUNCTION public.merge_store_settings_with_defaults(p_settings jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    v_defaults jsonb;
    v_fiscal jsonb;
    v_tax jsonb;
    v_stock jsonb;
    v_pos jsonb;
    v_documents jsonb;
    v_reports jsonb;
    v_alerts jsonb;
    
    -- Legacy fields
    v_legacy_wp integer;
    v_legacy_dc text;
    v_legacy_cn text;
    v_legacy_notes text;
    v_legacy_vat_default numeric;
    
    -- Input values
    v_in_fiscal jsonb;
    v_in_tax jsonb;
    v_in_stock jsonb;
    v_in_pos jsonb;
    v_in_documents jsonb;
    v_in_reports jsonb;
    v_in_alerts jsonb;
    
    v_vat_payer boolean;
BEGIN
    v_defaults := public.get_default_store_settings();
    
    IF p_settings IS NULL OR p_settings = '{}'::jsonb THEN
        RETURN v_defaults;
    END IF;
    
    -- Extract legacy flat keys if they exist in root
    v_legacy_wp := (p_settings ->> 'workpointNumber')::integer;
    v_legacy_dc := p_settings ->> 'displayCode';
    v_legacy_cn := p_settings ->> 'companyName';
    v_legacy_notes := p_settings ->> 'notes';
    
    -- Extract namespaces from input
    v_in_fiscal := p_settings -> 'fiscal';
    v_in_tax := p_settings -> 'tax';
    v_in_stock := p_settings -> 'stock';
    v_in_pos := p_settings -> 'pos';
    v_in_documents := p_settings -> 'documents';
    v_in_reports := p_settings -> 'reports';
    v_in_alerts := p_settings -> 'alerts';
    -- 1. Merge fiscal
    v_fiscal := v_defaults -> 'fiscal';
    IF v_in_fiscal IS NOT NULL AND jsonb_typeof(v_in_fiscal) = 'object' THEN
        v_fiscal := v_fiscal || v_in_fiscal;
    END IF;
    -- Apply legacy overrides if fiscal fields not set
    IF v_legacy_wp IS NOT NULL AND NOT (v_fiscal ? 'workpoint_number') THEN
        v_fiscal := jsonb_set(v_fiscal, '{workpoint_number}', to_jsonb(v_legacy_wp));
    END IF;
    IF v_legacy_dc IS NOT NULL AND NOT (v_fiscal ? 'display_code') THEN
        v_fiscal := jsonb_set(v_fiscal, '{display_code}', to_jsonb(v_legacy_dc));
    END IF;
    IF v_legacy_cn IS NOT NULL AND NOT (v_fiscal ? 'company_name') THEN
        v_fiscal := jsonb_set(v_fiscal, '{company_name}', to_jsonb(v_legacy_cn));
    END IF;
    IF v_legacy_notes IS NOT NULL AND NOT (v_fiscal ? 'notes') THEN
        v_fiscal := jsonb_set(v_fiscal, '{notes}', to_jsonb(v_legacy_notes));
    END IF;
    -- 2. Merge tax
    v_tax := v_defaults -> 'tax';
    IF v_in_tax IS NOT NULL AND jsonb_typeof(v_in_tax) = 'object' THEN
        -- Strip legacy properties from v_in_tax to keep the namespace clean
        v_in_tax := v_in_tax - 'vat_default' - 'vat_rates';
        
        DECLARE
            v_in_groups jsonb;
            v_final_groups jsonb;
            v_grp_key text;
            v_grp_val jsonb;
        BEGIN
            v_in_groups := v_in_tax -> 'vat_groups';
            v_final_groups := v_tax -> 'vat_groups';
            
            -- If input has vat_groups, merge key-by-key
            IF v_in_groups IS NOT NULL AND jsonb_typeof(v_in_groups) = 'object' THEN
                FOR v_grp_key, v_grp_val IN SELECT * FROM jsonb_each(v_in_groups)
                LOOP
                    -- Only accept keys A-E
                    IF v_grp_key IN ('A', 'B', 'C', 'D', 'E') AND jsonb_typeof(v_grp_val) = 'object' THEN
                        -- Merge with existing group key
                        v_final_groups := jsonb_set(
                            v_final_groups, 
                            ARRAY[v_grp_key], 
                            (v_final_groups -> v_grp_key) || v_grp_val
                        );
                    END IF;
                END LOOP;
            END IF;
            
            -- Enforce system VAT rates and fiscal codes on final groups (Romania standard A-E)
            v_final_groups := jsonb_set(v_final_groups, '{A,rate}', '21'::jsonb);
            v_final_groups := jsonb_set(v_final_groups, '{A,fiscal_code}', '"A"'::jsonb);
            
            v_final_groups := jsonb_set(v_final_groups, '{B,rate}', '11'::jsonb);
            v_final_groups := jsonb_set(v_final_groups, '{B,fiscal_code}', '"B"'::jsonb);
            
            v_final_groups := jsonb_set(v_final_groups, '{C,rate}', '11'::jsonb);
            v_final_groups := jsonb_set(v_final_groups, '{C,fiscal_code}', '"C"'::jsonb);
            
            v_final_groups := jsonb_set(v_final_groups, '{D,rate}', '0'::jsonb);
            v_final_groups := jsonb_set(v_final_groups, '{D,fiscal_code}', '"D"'::jsonb);
            
            v_final_groups := jsonb_set(v_final_groups, '{E,rate}', '0'::jsonb);
            v_final_groups := jsonb_set(v_final_groups, '{E,fiscal_code}', '"E"'::jsonb);
            
            -- Merge other tax settings (price_tax_policy, default_vat_group, vat_payer)
            v_tax := v_tax || (v_in_tax - 'vat_groups');
            -- Set final merged groups
            v_tax := jsonb_set(v_tax, '{vat_groups}', v_final_groups);
        END;
    END IF;
    
    -- Legacy VAT mapping (e.g. mapping 19, 9, 5 to Romanian tax groups standard A-E)
    -- Only apply if default_vat_group is not explicitly provided in the new schema format
    IF v_in_tax IS NULL OR NOT (v_in_tax ? 'default_vat_group') THEN
        v_legacy_vat_default := (p_settings -> 'tax' ->> 'vat_default')::numeric;
        IF v_legacy_vat_default IS NOT NULL THEN
            IF v_legacy_vat_default IN (19, 21, 24, 20) THEN
                v_tax := jsonb_set(v_tax, '{default_vat_group}', '"A"');
            ELSIF v_legacy_vat_default IN (9, 11) THEN
                v_tax := jsonb_set(v_tax, '{default_vat_group}', '"B"');
            ELSIF v_legacy_vat_default = 5 THEN
                v_tax := jsonb_set(v_tax, '{default_vat_group}', '"C"');
            ELSIF v_legacy_vat_default = 0 THEN
                v_tax := jsonb_set(v_tax, '{default_vat_group}', '"E"');
            END IF;
        END IF;
    END IF;
    
    -- If default_vat_group is not one of A, B, C, D, E, fallback to A
    IF v_tax ->> 'default_vat_group' NOT IN ('A', 'B', 'C', 'D', 'E') THEN
        v_tax := jsonb_set(v_tax, '{default_vat_group}', '"A"');
    END IF;
    -- Enforce vat_payer alignment
    v_vat_payer := (v_tax ->> 'vat_payer')::boolean;
    IF v_vat_payer = false THEN
        v_tax := jsonb_set(v_tax, '{default_vat_group}', '"E"');
    ELSE
        -- If vat_payer is true and group is E (which is neplatitor/TVA 0), fallback default group to A
        IF v_tax ->> 'default_vat_group' = 'E' THEN
            v_tax := jsonb_set(v_tax, '{default_vat_group}', '"A"');
        END IF;
    END IF;
    -- 3. Merge stock
    v_stock := v_defaults -> 'stock';
    IF v_in_stock IS NOT NULL AND jsonb_typeof(v_in_stock) = 'object' THEN
        v_stock := v_stock || v_in_stock;
    END IF;
    -- 4. Merge pos
    v_pos := v_defaults -> 'pos';
    IF v_in_pos IS NOT NULL AND jsonb_typeof(v_in_pos) = 'object' THEN
        v_pos := v_pos || v_in_pos;
    END IF;
    -- 5. Merge documents
    v_documents := v_defaults -> 'documents';
    IF v_in_documents IS NOT NULL AND jsonb_typeof(v_in_documents) = 'object' THEN
        v_documents := v_documents || v_in_documents;
    END IF;
    -- 6. Merge reports
    v_reports := v_defaults -> 'reports';
    IF v_in_reports IS NOT NULL AND jsonb_typeof(v_in_reports) = 'object' THEN
        v_reports := v_reports || v_in_reports;
    END IF;
    -- 7. Merge alerts
    v_alerts := v_defaults -> 'alerts';
    IF v_in_alerts IS NOT NULL AND jsonb_typeof(v_in_alerts) = 'object' THEN
        v_alerts := v_alerts || v_in_alerts;
    END IF;
    RETURN jsonb_build_object(
        'fiscal', v_fiscal,
        'tax', v_tax,
        'stock', v_stock,
        'pos', v_pos,
        'documents', v_documents,
        'reports', v_reports,
        'alerts', v_alerts
    );
END;
$function$;
