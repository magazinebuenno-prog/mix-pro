-- TABELA DE PRODUTOS
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  desc TEXT,
  images TEXT[] DEFAULT '{}',
  stock BOOLEAN DEFAULT true,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE CATEGORIAS
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- TABELA DE STAFF
CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  login TEXT UNIQUE NOT NULL
);

-- INSERTS INICIAIS
INSERT INTO categories (name) VALUES ('Utilidades'), ('Eletrônicos'), ('Cozinha'), ('Presentes');

-- HABILITAR RLS (Segurança básica para o demo)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON products FOR INSERT WITH CHECK (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read cats" ON categories FOR SELECT USING (true);