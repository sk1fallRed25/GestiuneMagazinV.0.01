-- IMPORTANT: Acest SQL este PROPUS și NU este aplicat automat.
-- Scopul este asigurarea atomicității (tranzacționalitate) pentru operațiunile de casare/pierdere.

/*
CREATE OR REPLACE FUNCTION scrap_stock(
    p_produs_id BIGINT,
    p_user_id UUID,
    p_cantitate DECIMAL,
    p_motiv TEXT,
    p_new_stoc_magazin DECIMAL,
    p_new_stoc_depozit DECIMAL
) RETURNS void AS $$
DECLARE
    v_total_stock_actual DECIMAL;
BEGIN
    -- 1. Verificare validitate utilizator (opțional, depinde de RLS)
    -- IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    --     RAISE EXCEPTION 'Utilizator invalid';
    -- END IF;

    -- 2. Verificare stoc actual pentru a preveni "race conditions"
    SELECT (stoc_magazin + stoc_depozit) INTO v_total_stock_actual
    FROM produse 
    WHERE id = p_produs_id
    FOR UPDATE; -- Lock pe rândul respectiv

    IF v_total_stock_actual < p_cantitate THEN
        RAISE EXCEPTION 'Stoc insuficient pentru casare. Disponibil: %', v_total_stock_actual;
    END IF;

    -- 3. Înregistrare Pierdere
    INSERT INTO pierderi (produs_id, user_id, cantitate, motiv, sursa_stoc)
    VALUES (
        p_produs_id, 
        p_user_id, 
        p_cantitate, 
        p_motiv,
        CASE 
            WHEN p_new_stoc_magazin < (SELECT stoc_magazin FROM produse WHERE id = p_produs_id) AND p_new_stoc_depozit < (SELECT stoc_depozit FROM produse WHERE id = p_produs_id) THEN 'Mixt (Raft + Depozit)'
            WHEN p_new_stoc_magazin < (SELECT stoc_magazin FROM produse WHERE id = p_produs_id) THEN 'Raft'
            ELSE 'Depozit'
        END
    );

    -- 4. Actualizare Stoc Produse
    UPDATE produse 
    SET 
        stoc_magazin = p_new_stoc_magazin,
        stoc_depozit = p_new_stoc_depozit,
        updated_at = NOW()
    WHERE id = p_produs_id;

    -- 5. TODO: Creare mișcare de stoc (stock_movements) pentru trasabilitate completă

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- NOTĂ: În implementarea finală, algoritmul de calcul pentru sursa_stoc (Raft/Depozit) 
-- ar trebui să fie tot în interiorul funcției SQL pentru a fi 100% sigur.
