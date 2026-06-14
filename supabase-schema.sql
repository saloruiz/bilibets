-- ============================================================
-- VILIBETS — Schema v2 (sessions/bilis)
-- Run this in your Supabase SQL editor (replace previous schema)
-- ============================================================

-- Drop old tables if exist
DROP TABLE IF EXISTS house_entries CASCADE;
DROP TABLE IF EXISTS betting_houses CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Sessions (bilis)
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players per session with custom percentage
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#00e676',
  percentage NUMERIC(5,2) NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Betting houses per session
CREATE TABLE session_houses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- House entries (data per house)
CREATE TABLE house_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID REFERENCES session_houses(id) ON DELETE CASCADE UNIQUE NOT NULL,
  bono_desc TEXT DEFAULT '',
  apuesta NUMERIC(10,2) DEFAULT NULL,
  contraapuesta_1 TEXT DEFAULT NULL,         -- free-text note
  perdida NUMERIC(10,2) DEFAULT NULL,        -- always stored positive, subtracted in total
  bono NUMERIC(10,2) DEFAULT NULL,
  contraapuesta_2 TEXT DEFAULT NULL,         -- free-text note
  beneficio_expr TEXT DEFAULT NULL,          -- raw expression e.g. "6+7+8+9"
  beneficio NUMERIC(10,2) DEFAULT NULL,      -- evaluated result
  notes TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (open policies — restrict later with auth if needed)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON session_houses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON house_entries FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE session_houses;
ALTER PUBLICATION supabase_realtime ADD TABLE house_entries;
