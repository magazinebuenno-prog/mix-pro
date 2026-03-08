CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  category TEXT DEFAULT 'Geral',
  description TEXT,
  image_url TEXT,
  images TEXT[], -- Para suporte múltiplo
  code TEXT,
  stock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

INSERT INTO categories (name) VALUES ('Utilidades'), ('Eletrônicos'), ('Cozinha'), ('Presentes');