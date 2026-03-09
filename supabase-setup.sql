-- Tabela de Produtos
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  code TEXT,
  stock BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Categorias
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Tabela de Staff (Colaboradores)
CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  firstName TEXT NOT NULL,
  login TEXT UNIQUE NOT NULL
);