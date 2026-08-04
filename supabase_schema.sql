-- ============================================
-- SCHEMA PARA SUPABASE
-- Gestão de Jogos (Raspadinhas & Euromilhões)
-- Verificado e funcional
-- ============================================

-- Pessoas que participam nas raspadinhas
CREATE TABLE IF NOT EXISTS people (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Meses de raspadinhas
CREATE TABLE IF NOT EXISTS scratch_months (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    amount_per_person NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    existing_funds NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    winnings NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    played_amount NUMERIC(10, 2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (year, month)
);

-- Pagamentos de raspadinhas por pessoa/mês
CREATE TABLE IF NOT EXISTS scratch_payments (
    id SERIAL PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    month_id INTEGER NOT NULL REFERENCES scratch_months(id) ON DELETE CASCADE,
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (person_id, month_id)
);

-- Saldo inicial da caixa das raspadinhas
CREATE TABLE IF NOT EXISTS scratch_caixa_initial (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

-- Euromilhões - depósitos de dinheiro
CREATE TABLE IF NOT EXISTS euro_fund (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'expense')),
    amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Euromilhões - semanas jogadas
CREATE TABLE IF NOT EXISTS euro_weeks (
    id SERIAL PRIMARY KEY,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    ticket_cost NUMERIC(10, 2) NOT NULL DEFAULT 25.00,
    prize NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Inserir saldo inicial da caixa se não existir
INSERT INTO scratch_caixa_initial (amount)
SELECT 0.00
WHERE NOT EXISTS (SELECT 1 FROM scratch_caixa_initial);
