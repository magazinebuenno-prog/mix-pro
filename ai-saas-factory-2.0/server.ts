import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("factory.db");

// Inicialização do Banco de Dados
db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    niche TEXT NOT NULL,
    template_id INTEGER,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(template_id) REFERENCES templates(id)
  );
`);

// Migração: Adicionar zip_base64 se não existir
try {
  db.exec("ALTER TABLE generations ADD COLUMN zip_base64 TEXT");
} catch (e) {
  // Coluna já existe ou outro erro ignorável
}

// Prompt de Especialista em Migração (Alta Fidelidade + Sincronismo)
const defaultPrompt = `Você é um Especialista em Migração de Código (Code Migration Specialist).
Sua missão é converter o TEMPLATE BASE para o nicho "{{niche}}" mantendo a INTEGRIDADE TOTAL do código original e garantindo o sincronismo com o Supabase.

PROTOCOLO DE MIGRAÇÃO OBRIGATÓRIO:
1. PRESERVAÇÃO DE UI/UX: Mantenha EXATAMENTE o mesmo HTML, CSS, IDs e Classes. NÃO REESCREVA O SITE.
2. INTEGRAÇÃO SUPABASE (REGRAS TÉCNICAS):
   - Adicione o SDK: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   - Inicialize: const _supabase = supabase.createClient('{{supabase_url}}', '{{supabase_key}}');
   - SINCRONIZAÇÃO DE ESTADO (CRÍTICO): 
     * Todas as funções de "Add" (ex: addCategory, addProduct) devem ser ASYNC.
     * Após o 'insert' no Supabase, você DEVE fazer um novo 'select' para atualizar a variável global (ex: categories = data) e SÓ ENTÃO chamar as funções de renderização (renderAdmin(), renderProducts()).
     * Garanta que o campo <select> de categorias no formulário de produtos seja repopulado imediatamente após a criação de uma nova categoria.
   - CARREGAMENTO INICIAL: No DOMContentLoaded, use 'await' para buscar Produtos, Categorias e Colaboradores antes de chamar as funções de renderização iniciais.
3. SQL SCHEMA: Gere o SQL com as tabelas 'products', 'categories' e 'staff' seguindo exatamente os campos do seu JS.

SAÍDA: Retorne APENAS o JSON com index_html, landing_html, supabase_sql, netlify_toml.
AVISO: Se a seleção de categorias não atualizar após criar uma categoria, a migração será considerada FALHA.`;

const stmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
stmt.run("system_prompt", defaultPrompt);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));


  // API: Templates
  app.get("/api/templates", (req, res) => {
    const templates = db.prepare("SELECT * FROM templates ORDER BY created_at DESC").all();
    res.json(templates);
  });

  app.post("/api/templates", (req, res) => {
    const { name, description, content } = req.body;
    const info = db.prepare("INSERT INTO templates (name, description, content) VALUES (?, ?, ?)").run(name, description, content);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/templates/:id", (req, res) => {
    db.prepare("DELETE FROM templates WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // API: Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsMap = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  // API: Generations
  app.get("/api/generations", (req, res) => {
    const gens = db.prepare("SELECT * FROM generations ORDER BY created_at DESC").all();
    res.json(gens);
  });

  // Endpoint para o frontend salvar uma geração concluída ou em erro
  app.post("/api/generations", (req, res) => {
    const { id, niche, template_id, status, zip_base64 } = req.body;
    
    if (id) {
      // Atualizar registro existente
      db.prepare("UPDATE generations SET status = ?, zip_base64 = ? WHERE id = ?")
        .run(status, zip_base64 || null, id);
      return res.json({ success: true });
    } else {
      // Criar novo registro
      const info = db.prepare("INSERT INTO generations (niche, template_id, status, zip_base64) VALUES (?, ?, ?, ?)")
        .run(niche, template_id, status, zip_base64 || null);
      return res.json({ id: info.lastInsertRowid });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log("Fábrica rodando em http://localhost:3000");
  });
}

startServer();
