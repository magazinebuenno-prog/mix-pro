import React, { useState, useEffect } from "react";
import { 
  Factory, 
  Library, 
  Settings, 
  LayoutDashboard, 
  Plus, 
  Trash2, 
  Zap, 
  Database, 
  Globe, 
  Code,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";
import JSZip from "jszip";

// --- Types ---
interface Template {
  id: number;
  name: string;
  description: string;
  content: string;
  created_at: string;
}

interface Generation {
  id: number;
  niche: string;
  template_id: number;
  status: string;
  created_at: string;
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      active 
        ? "bg-zinc-800 text-emerald-400 border border-zinc-700 shadow-lg" 
        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // Form States
  const [newTemplate, setNewTemplate] = useState({ name: "", description: "", content: "" });
  const [factoryConfig, setFactoryConfig] = useState({ 
    niches: "", 
    templateId: "", 
    supabaseUrl: "", 
    supabaseKey: "" 
  });

  const [generations, setGenerations] = useState<any[]>([]);

  useEffect(() => {
    fetchTemplates();
    fetchSettings();
    fetchGenerations();
    
    // Polling para atualizar dashboard
    const interval = setInterval(fetchGenerations, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTemplates = async () => {
    const res = await fetch("/api/templates");
    const data = await res.json();
    setTemplates(data);
  };

  const fetchSettings = async () => {
    const res = await fetch("/api/settings");
    const data = await res.json();
    setSettings(data);
    // Auto-fill factory config if settings exist
    setFactoryConfig(prev => ({
      ...prev,
      supabaseUrl: data.supabase_url || "",
      supabaseKey: data.supabase_key || ""
    }));
  };

  const fetchGenerations = async () => {
    const res = await fetch("/api/generations");
    const data = await res.json();
    setGenerations(data);
  };

  const downloadZip = (base64: string, niche: string) => {
    const link = document.createElement("a");
    link.href = `data:application/zip;base64,${base64}`;
    link.download = `saas-${niche.toLowerCase().replace(/\s+/g, "-")}.zip`;
    link.click();
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) return;
    setLoading(true);
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTemplate)
    });
    setNewTemplate({ name: "", description: "", content: "" });
    fetchTemplates();
    setLoading(false);
  };

  const handleDeleteTemplate = async (id: number) => {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  };

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSaveSettings = async (key: string, value: string) => {
    setLoading(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });
      await fetchSettings();
      setSaveStatus(key);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAllCredentials = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "supabase_url", value: settings.supabase_url })
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "supabase_key", value: settings.supabase_key })
        })
      ]);
      await fetchSettings();
      setSaveStatus("credentials");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error("Erro ao salvar credenciais:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPrompt = async () => {
    if (!confirm("Deseja resetar para o modo ESPECIALISTA V3? Este modo resolve o erro de categorias vazias e falha no cadastro.")) return;
    const defaultPrompt = `Você é um Especialista em Migração Cirúrgica de Código.
OBJETIVO: Migrar o TEMPLATE BASE para o nicho "{{niche}}" garantindo que o fluxo de dados do Supabase seja idêntico ao localStorage original.

REGRAS DE OURO (NÃO NEGOCIÁVEIS):
1. COMPATIBILIDADE DE DADOS: 
   - Se o código original usa "categories" como um array de strings (ex: ['A', 'B']), você DEVE mapear o retorno do Supabase: "categories = data.map(c => c.name)".
   - Garanta que as funções "renderAdmin()" e "renderProducts()" recebam os dados exatamente no formato que esperavam originalmente.
2. SINCRONISMO DE CATEGORIAS:
   - A função "addCategory" deve: 1. Salvar no Supabase -> 2. Buscar lista nova -> 3. Atualizar a variável global -> 4. Chamar renderAdmin() para reconstruir o <select>.
   - O campo <select id="new-p-cat"> deve ser limpo e preenchido com as novas categorias imediatamente.
3. PRESERVAÇÃO DE UI: Não altere nenhuma classe Tailwind, ID ou estrutura de Modal. Mantenha o Carrossel e o Zoom intactos.
4. SQL SCHEMA: Crie a tabela "categories" com a coluna "name" (TEXT) e a tabela "products" com as colunas exatas do seu JS (name, price, category, desc, images, code, stock).

SAÍDA: JSON com index_html, landing_html, supabase_sql, netlify_toml.
AVISO: Se o dropdown de categorias aparecer vazio após o cadastro, a migração falhou.`;
    
    setSettings(prev => ({ ...prev, system_prompt: defaultPrompt }));
    await handleSaveSettings("system_prompt", defaultPrompt);
    alert("🚀 Modo Especialista V3 Ativado! Agora as categorias funcionarão perfeitamente. Salve o prompt e gere novamente.");
  };

  const handleStartFactory = async () => {
    if (!factoryConfig.niches || !factoryConfig.templateId) return;
    setLoading(true);
    
    const nicheList = factoryConfig.niches.split("\n").map(n => n.trim()).filter(n => n);
    const template = templates.find(t => t.id === Number(factoryConfig.templateId));
    
    if (!template) {
      alert("Template não encontrado");
      setLoading(false);
      return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

    for (const niche of nicheList) {
      // 1. Criar registro inicial no backend
      const startRes = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          template_id: template.id,
          status: "Processando"
        })
      });
      const { id: generationId } = await startRes.json();
      fetchGenerations();

      try {
        const prompt = settings.system_prompt
          .replace("{{niche}}", niche)
          .replace("{{supabase_url}}", factoryConfig.supabaseUrl)
          .replace("{{supabase_key}}", factoryConfig.supabaseKey);

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            { role: "user", parts: [{ text: `Template Base:\n${template.content}\n\n${prompt}` }] }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                index_html: { type: Type.STRING },
                landing_html: { type: Type.STRING },
                supabase_sql: { type: Type.STRING },
                netlify_toml: { type: Type.STRING }
              },
              required: ["index_html", "landing_html", "supabase_sql", "netlify_toml"]
            }
          }
        });

        const result = JSON.parse(response.text);

        // Criar ZIP no frontend
        const zip = new JSZip();
        zip.file("index.html", result.index_html);
        zip.file("landing.html", result.landing_html);
        zip.file("supabase-setup.sql", result.supabase_sql);
        zip.file("netlify.toml", result.netlify_toml);
        zip.file("README.md", `# SaaS Factory: ${niche}\n\nGerado automaticamente para o nicho ${niche}.`);

        const zipBase64 = await zip.generateAsync({ type: "base64" });

        // 2. Atualizar no backend
        await fetch("/api/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: generationId,
            status: "Concluído",
            zip_base64: zipBase64
          })
        });

      } catch (error: any) {
        console.error(`Erro no nicho ${niche}:`, error);
        await fetch("/api/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: generationId,
            status: "Erro: " + (error.message || "Falha na IA")
          })
        });
      }
      fetchGenerations();
    }
    
    setLoading(false);
    alert("Processamento da esteira concluído!");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Factory className="text-zinc-950" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">SaaS Factory</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">v2.0 Niche Edition</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeTab === "dashboard"} 
            onClick={() => setActiveTab("dashboard")} 
          />
          <SidebarItem 
            icon={Library} 
            label="Template Library" 
            active={activeTab === "library"} 
            onClick={() => setActiveTab("library")} 
          />
          <SidebarItem 
            icon={Zap} 
            label="Factory Mode" 
            active={activeTab === "factory"} 
            onClick={() => setActiveTab("factory")} 
          />
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            active={activeTab === "settings"} 
            onClick={() => setActiveTab("settings")} 
          />
        </nav>

        <div className="mt-auto p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-zinc-400">System Ready</span>
          </div>
          <p className="text-[10px] text-zinc-500">Connected to Gemini 3.1 Pro</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto"
            >
              <header className="mb-10">
                <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
                <p className="text-zinc-400">Visão geral da sua produção de SaaS.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Templates Salvos</p>
                  <p className="text-4xl font-light">{templates.length}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">SaaS Gerados</p>
                  <p className="text-4xl font-light">0</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                  <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Status da IA</p>
                  <p className="text-xl font-medium text-emerald-400">Operacional</p>
                </div>
              </div>

              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                  <h3 className="font-semibold">Gerações Recentes</h3>
                  <button 
                    onClick={fetchGenerations}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    Atualizar
                  </button>
                </div>
                <div className="divide-y divide-zinc-800">
                  {generations.length === 0 ? (
                    <div className="p-10 text-center text-zinc-500">
                      <Globe className="mx-auto mb-4 opacity-20" size={48} />
                      <p>Nenhuma geração encontrada. Vá para o Factory Mode para começar.</p>
                    </div>
                  ) : (
                    generations.map(gen => (
                      <div key={gen.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${gen.status === "Concluído" ? "bg-emerald-500" : "bg-yellow-500 animate-pulse"}`}></div>
                          <div>
                            <p className="font-medium">{gen.niche}</p>
                            <p className="text-[10px] text-zinc-500 uppercase font-mono">
                              {new Date(gen.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span 
                            onClick={() => gen.status.startsWith("Erro") && alert(gen.status)}
                            className={`text-xs px-2 py-1 rounded cursor-pointer ${gen.status === "Concluído" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
                          >
                            {gen.status.startsWith("Erro") ? "Erro (ver detalhes)" : gen.status}
                          </span>
                          {gen.zip_base64 && (
                            <button 
                              onClick={() => downloadZip(gen.zip_base64, gen.niche)}
                              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-emerald-400 transition-colors"
                              title="Download ZIP"
                            >
                              <Download size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === "library" && (
            <motion.div 
              key="library"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto"
            >
              <header className="mb-10 flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Template Library</h2>
                  <p className="text-zinc-400">Gerencie seus arquivos HTML base para reutilização.</p>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form */}
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Plus size={20} className="text-emerald-400" />
                    Novo Template
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase font-mono mb-1 block">Nome do Template</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Dashboard Admin Clean"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                        value={newTemplate.name}
                        onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase font-mono mb-1 block">Descrição</label>
                      <input 
                        type="text" 
                        placeholder="Breve descrição do estilo ou nicho original"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                        value={newTemplate.description}
                        onChange={e => setNewTemplate({...newTemplate, description: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase font-mono mb-1 block">Código HTML Base</label>
                      <textarea 
                        placeholder="Cole seu código HTML aqui..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 h-64 font-mono text-xs focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                        value={newTemplate.content}
                        onChange={e => setNewTemplate({...newTemplate, content: e.target.value})}
                      />
                    </div>
                    <button 
                      onClick={handleSaveTemplate}
                      disabled={loading}
                      className="w-full bg-emerald-500 text-zinc-950 font-bold py-3 rounded-lg hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                      Salvar na Biblioteca
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-6">Templates Salvos</h3>
                  {templates.length === 0 ? (
                    <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-10 rounded-2xl text-center text-zinc-500">
                      Nenhum template salvo ainda.
                    </div>
                  ) : (
                    templates.map(t => (
                      <div key={t.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400">
                            <Code size={20} />
                          </div>
                          <div>
                            <h4 className="font-medium">{t.name}</h4>
                            <p className="text-xs text-zinc-500">{t.description || "Sem descrição"}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteTemplate(t.id)}
                          className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "factory" && (
            <motion.div 
              key="factory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto"
            >
              <header className="mb-10">
                <h2 className="text-3xl font-bold mb-2">Factory Mode</h2>
                <p className="text-zinc-400">Configure a geração em massa para diferentes nichos.</p>
              </header>

              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase font-mono mb-2 block">1. Selecione o Template Base</label>
                      <select 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500"
                        value={factoryConfig.templateId}
                        onChange={e => setFactoryConfig({...factoryConfig, templateId: e.target.value})}
                      >
                        <option value="">Selecione um template...</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase font-mono mb-2 block">2. Liste os Nichos (um por linha)</label>
                      <textarea 
                        placeholder="Academia&#10;Dentista&#10;Advogado&#10;Pet Shop"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 h-48 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                        value={factoryConfig.niches}
                        onChange={e => setFactoryConfig({...factoryConfig, niches: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase font-mono mb-2 block flex items-center gap-2">
                        <Database size={14} /> 3. Credenciais Supabase
                      </label>
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          placeholder="SUPABASE_URL"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
                          value={factoryConfig.supabaseUrl}
                          onChange={e => setFactoryConfig({...factoryConfig, supabaseUrl: e.target.value})}
                        />
                        <input 
                          type="password" 
                          placeholder="SUPABASE_ANON_KEY"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
                          value={factoryConfig.supabaseKey}
                          onChange={e => setFactoryConfig({...factoryConfig, supabaseKey: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase mb-2 flex items-center gap-2">
                        <CheckCircle2 size={14} /> O que será gerado:
                      </h4>
                      <ul className="text-xs text-zinc-400 space-y-1">
                        <li>• HTML adaptado para cada nicho</li>
                        <li>• Landing Page de alta conversão</li>
                        <li>• Integração Supabase Auth/DB</li>
                        <li>• Script SQL para o banco</li>
                        <li>• Configuração Netlify</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleStartFactory}
                  disabled={loading || !factoryConfig.niches || !factoryConfig.templateId}
                  className="w-full bg-emerald-500 text-zinc-950 font-black text-lg py-5 rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      PROCESSANDO ESTEIRA...
                    </>
                  ) : (
                    <>
                      <Zap size={24} fill="currentColor" />
                      INICIAR PRODUÇÃO EM MASSA
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto"
            >
              <header className="mb-10">
                <h2 className="text-3xl font-bold mb-2">Settings</h2>
                <p className="text-zinc-400">Configure o comportamento da IA e credenciais padrão.</p>
              </header>

              <div className="space-y-8">
                <section className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Code size={20} className="text-emerald-400" />
                      AI System Prompt
                    </h3>
                    {saveStatus === "system_prompt" && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 animate-bounce">
                        <CheckCircle2 size={14} /> Prompt Atualizado!
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 mb-4">
                    Este é o prompt que define como o Gemini deve agir ao adaptar seus templates. 
                    Use <code className="text-emerald-400">{"{{niche}}"}</code>, <code className="text-emerald-400">{"{{supabase_url}}"}</code> e <code className="text-emerald-400">{"{{supabase_key}}"}</code> como variáveis.
                  </p>
                  <textarea 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 h-64 font-mono text-xs focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                    value={settings.system_prompt || ""}
                    onChange={e => setSettings({...settings, system_prompt: e.target.value})}
                  />
                  <div className="mt-4 flex justify-between items-center">
                    <button 
                      onClick={handleResetPrompt}
                      className="text-xs text-zinc-500 hover:text-zinc-300 underline"
                    >
                      Resetar para o padrão original
                    </button>
                    <button 
                      onClick={() => handleSaveSettings("system_prompt", settings.system_prompt)}
                      disabled={loading}
                      className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-6 py-2 rounded-lg transition-colors text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading && saveStatus === "system_prompt" ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                      Salvar Prompt
                    </button>
                  </div>
                </section>

                <section className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Database size={20} className="text-emerald-400" />
                      Credenciais Padrão
                    </h3>
                    {saveStatus === "credentials" && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 animate-bounce">
                        <CheckCircle2 size={14} /> Credenciais Salvas!
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase font-mono mb-2 block">Supabase URL</label>
                      <input 
                        type="text" 
                        placeholder="https://xyz.supabase.co"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
                        value={settings.supabase_url || ""}
                        onChange={e => setSettings({...settings, supabase_url: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase font-mono mb-2 block">Supabase Anon Key</label>
                      <input 
                        type="password" 
                        placeholder="eyJhbG..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
                        value={settings.supabase_key || ""}
                        onChange={e => setSettings({...settings, supabase_key: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button 
                      onClick={handleSaveAllCredentials}
                      disabled={loading}
                      className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-8 py-3 rounded-lg transition-colors text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading && saveStatus === "credentials" ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                      Salvar Credenciais
                    </button>
                  </div>
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
