CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE staff (
    id BIGSERIAL PRIMARY KEY,
    fullName TEXT NOT NULL,
    firstName TEXT,
    login TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    desc TEXT,
    images JSONB DEFAULT '[]',
    code TEXT,
    stock BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO categories (name) VALUES ('Utilidades'), ('Presentes'), ('Eletrônicos'), ('Cozinha'), ('Decoração'), ('Ferramentas');