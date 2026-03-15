CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT,
  "desc" TEXT,
  images JSONB DEFAULT '[]',
  code TEXT,
  stock BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserção de categorias padrão
INSERT INTO categories (name) VALUES ('Utilidades'), ('Eletrônicos'), ('Decoração'), ('Presentes');