-- RenoVision Database Schema
-- 53 Thurston Road, Toronto — Home Renovation Management

-- Work packages
CREATE TABLE IF NOT EXISTS work_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started',
  budget_allocated DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget line items
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_package_id UUID REFERENCES work_packages(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  estimated_cost DECIMAL(10,2),
  quoted_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  status TEXT DEFAULT 'estimated',
  vendor TEXT,
  notes TEXT,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contractors / Suppliers
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  trade TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'prospective',
  rating INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contractor <-> Work Package assignments
CREATE TABLE IF NOT EXISTS contractor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
  work_package_id UUID REFERENCES work_packages(id) ON DELETE CASCADE,
  quote_amount DECIMAL(10,2),
  is_selected BOOLEAN DEFAULT FALSE,
  quote_notes TEXT
);

-- Photos & files
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  category TEXT,
  room TEXT,
  tags TEXT[],
  notes TEXT,
  work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule tasks
CREATE TABLE IF NOT EXISTS schedule_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_package_id UUID REFERENCES work_packages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'scheduled',
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  is_milestone BOOLEAN DEFAULT FALSE,
  depends_on UUID[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  image_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design decisions
CREATE TABLE IF NOT EXISTS design_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_package_id UUID REFERENCES work_packages(id) ON DELETE SET NULL,
  category TEXT,
  title TEXT NOT NULL,
  description TEXT,
  product_name TEXT,
  product_code TEXT,
  brand TEXT,
  price_estimate DECIMAL(10,2),
  status TEXT DEFAULT 'considering',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (permissive for this private app)
ALTER TABLE work_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_decisions ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (no auth required — private app)
CREATE POLICY "Allow all on work_packages" ON work_packages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on budget_items" ON budget_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contractors" ON contractors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on contractor_assignments" ON contractor_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on files" ON files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on schedule_tasks" ON schedule_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chat_sessions" ON chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on design_decisions" ON design_decisions FOR ALL USING (true) WITH CHECK (true);

-- Create storage buckets (run via Supabase dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);
