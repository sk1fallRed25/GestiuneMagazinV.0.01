-- IMPORTANT: Acest SQL este PROPUS și NU este aplicat automat.
-- Scopul este asigurarea atomicității (tranzacționalitate) pentru operațiunile de transfer intern.

/*
CREATE OR REPLACE FUNCTION transfer_stock(
    p_produs_id BIGINT,
    p_cantitate DECIMAL,
    p_directie TEXT -- 'depozit_spre_magazin' sau 'magazin_spre_depozit'
) RETURNS void AS $$
DECLARE
    v_stoc_depozit_actual DECIMAL;
    v_stoc_magazin_actual DECIMAL;
BEGIN
    -- 1. Selectează stocurile actuale cu blocare pentru update
    SELECT stoc_depozit, stoc_magazin 
    INTO v_stoc_depozit_actual, v_stoc_magazin_actual
    FROM produse 
    WHERE id = p_produs_id
    FOR UPDATE;

    -- 2. Validare stoc în funcție de direcție
    IF p_directie = 'depozit_spre_magazin' THEN
        IF v_stoc_depozit_actual < p_cantitate THEN
            RAISE EXCEPTION 'Stoc insuficient în Depozit. Disponibil: %', v_stoc_depozit_actual;
        END IF;

        UPDATE produse 
        SET 
            stoc_depozit = stoc_depozit - p_cantitate,
            stoc_magazin = stoc_magazin + p_cantitate,
            updated_at = NOW()
        WHERE id = p_produs_id;
        
    ELSIF p_directie = 'magazin_spre_depozit' THEN
        IF v_stoc_magazin_actual < p_cantitate THEN
            RAISE EXCEPTION 'Stoc insuficient în Magazin. Disponibil: %', v_stoc_magazin_actual;
        END IF;

        UPDATE produse 
        SET 
            stoc_magazin = stoc_magazin - p_cantitate,
            stoc_depozit = stoc_depozit + p_cantitate,
            updated_at = NOW()
        WHERE id = p_produs_id;
        
    ELSE
        RAISE EXCEPTION 'Direcție de transfer invalidă: %', p_directie;
    END IF;

    -- 3. TODO: Creare mișcare de stoc (stock_movements) pentru audit
    -- INSERT INTO stock_movements (produs_id, tip, cantitate, sursa, destinatie) ...

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- NOTĂ: Utilizarea SECURITY DEFINER permite funcției să ruleze cu permisiuni de proprietar, 
-- ceea ce este util dacă RLS-ul este foarte restrictiv pe UPDATE direct.
