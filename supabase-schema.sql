-- Supabase Schema for Bilibets
-- Run this in your Supabase SQL editor

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Betting houses table
CREATE TABLE IF NOT EXISTS betting_houses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- House entries table (one row per house, all fields)
CREATE TABLE IF NOT EXISTS house_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  house_id UUID REFERENCES betting_houses(id) ON DELETE CASCADE UNIQUE,
  -- Phase 1: Initial bet
  bono_desc TEXT DEFAULT '',
  apuesta NUMERIC(10,2) DEFAULT NULL,
  contraapuesta_1 NUMERIC(10,2) DEFAULT NULL,
  perdida NUMERIC(10,2) DEFAULT NULL,
  -- Phase 2: Bonus
  bono NUMERIC(10,2) DEFAULT NULL,
  contraapuesta_2 NUMERIC(10,2) DEFAULT NULL,
  beneficio NUMERIC(10,2) DEFAULT NULL,
  -- Notes
  notes TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (public access for now, can be restricted later)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE betting_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON betting_houses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON house_entries FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE betting_houses;
ALTER PUBLICATION supabase_realtime ADD TABLE house_entries;

-- Seed default betting houses
INSERT INTO betting_houses (name, display_order, is_active, is_custom) VALUES
  ('VERSUS', 1, true, false),
  ('MARCAPUESTAS', 2, true, false),
  ('SPORTIUM', 3, true, false),
  ('BWIN', 4, true, false),
  ('BET365', 5, true, false),
  ('CODERE', 6, true, false),
  ('INTERWETTEN', 7, true, false),
  ('WINAMAX', 8, true, false),
  ('JUEGGING', 9, true, false),
  ('BETFAIR', 10, true, false),
  ('ONLYBET', 11, true, false),
  ('WILLIAM HILL', 12, true, false),
  ('POKERSTARS', 13, true, false),
  ('RETABET', 14, true, false),
  ('YASSSCASINO', 15, true, false),
  ('DAZNBET', 16, true, false)
ON CONFLICT DO NOTHING;

-- Seed initial house entries for each house
INSERT INTO house_entries (house_id)
SELECT id FROM betting_houses
ON CONFLICT (house_id) DO NOTHING;

-- Seed default players
INSERT INTO players (name, color) VALUES
  ('Salo', '#6366f1'),
  ('Llaik', '#ec4899')
ON CONFLICT DO NOTHING;
