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
  Upload,
  X,
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
  const [isStaticMode, setIsStaticMode] = useState(false);
  const [showDeployGuide, setShowDeployGuide] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await fetchTemplates();
        await fetchSettings();
        await fetchGenerations();
      } catch (error) {
        console.warn("Backend não detectado ou erro na conexão. Ativando Modo Estático (LocalStorage).");
        setIsStaticMode(true);
        loadFromLocalStorage();
      }
    };
    
    init();
    
    // Polling para atualizar dashboard (apenas se não for estático)
    const interval = setInterval(async () => {
      if (!isStaticMode) {
        try {
          await fetchGenerations();
        } catch (e) {
          // Silently fail polling if backend disappears
          console.debug("Polling failed, backend might be offline");
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isStaticMode]);

  const loadFromLocalStorage = () => {
    const localTemplates = JSON.parse(localStorage.getItem("factory_templates") || "[]");
    const localSettings = JSON.parse(localStorage.getItem("factory_settings") || "{}");
    const localGens = JSON.parse(localStorage.getItem("factory_generations") || "[]");
    
    setTemplates(localTemplates);
    setSettings(localSettings);
    setGenerations(localGens);
    
    setFactoryConfig(prev => ({
      ...prev,
      supabaseUrl: localSettings.supabase_url || "",
      supabaseKey: localSettings.supabase_key || ""
    }));
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Status " + res.status);
      const data = await res.json();
      setTemplates(data);
    } catch (error) {
      console.error("Erro ao buscar templates:", error);
      throw error;
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Status " + res.status);
      const data = await res.json();
      setSettings(data);
      setFactoryConfig(prev => ({
        ...prev,
        supabaseUrl: data.supabase_url || "",
        supabaseKey: data.supabase_key || ""
      }));
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
      throw error;
    }
  };

  const fetchGenerations = async () => {
    try {
      const res = await fetch("/api/generations");
      if (!res.ok) throw new Error("Status " + res.status);
      const data = await res.json();
      setGenerations(data);
    } catch (error) {
      console.error("Erro ao buscar gerações:", error);
      throw error;
    }
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
    try {
      if (isStaticMode) {
        const template = { ...newTemplate, id: Date.now(), created_at: new Date().toISOString() };
        const updated = [template, ...templates];
        setTemplates(updated);
        localStorage.setItem("factory_templates", JSON.stringify(updated));
      } else {
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTemplate)
        });
        if (!res.ok) throw new Error("Falha ao salvar template no servidor");
        await fetchTemplates();
      }
      setNewTemplate({ name: "", description: "", content: "" });
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      alert("Erro ao salvar template. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      if (isStaticMode) {
        const updated = templates.filter(t => t.id !== id);
        setTemplates(updated);
        localStorage.setItem("factory_templates", JSON.stringify(updated));
      } else {
        const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Falha ao deletar template no servidor");
        await fetchTemplates();
      }
    } catch (error) {
      console.error("Erro ao deletar template:", error);
      alert("Erro ao deletar template. Verifique a conexão.");
    }
  };

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSaveSettings = async (key: string, value: string) => {
    setLoading(true);
    try {
      if (isStaticMode) {
        const updated = { ...settings, [key]: value };
        setSettings(updated);
        localStorage.setItem("factory_settings", JSON.stringify(updated));
      } else {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value })
        });
        await fetchSettings();
      }
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
      if (isStaticMode) {
        const updated = { ...settings, supabase_url: settings.supabase_url, supabase_key: settings.supabase_key };
        setSettings(updated);
        localStorage.setItem("factory_settings", JSON.stringify(updated));
      } else {
        await Promise.all([
          handleSaveSettings("supabase_url", settings.supabase_url || ""),
          handleSaveSettings("supabase_key", settings.supabase_key || "")
        ]);
      }
      setSaveStatus("credentials");
      setTimeout(() => setSaveStatus(null), 3000);
      alert("Credenciais salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar credenciais:", error);
      alert("Erro ao salvar credenciais.");
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const data = {
      templates,
      settings,
      generations,
      version: "2.0"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saas-factory-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.templates) {
          setTemplates(data.templates);
          localStorage.setItem("factory_templates", JSON.stringify(data.templates));
        }
        if (data.settings) {
          setSettings(data.settings);
          localStorage.setItem("factory_settings", JSON.stringify(data.settings));
        }
        if (data.generations) {
          setGenerations(data.generations);
          localStorage.setItem("factory_generations", JSON.stringify(data.generations));
        }
        alert("Dados importados com sucesso!");
        window.location.reload();
      } catch (error) {
        alert("Erro ao importar arquivo. Formato inválido.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetPrompt = async () => {
    if (!confirm("Deseja resetar para o modo NETLIFY READY (V4)? Este modo organiza o ZIP para que a Landing Page seja a página principal.")) return;
    const defaultPrompt = `Você é um Especialista em Deploy no Netlify e Migração de Código.
OBJETIVO: Migrar o TEMPLATE BASE para o nicho "{{niche}}" gerando um pacote pronto para hospedagem profissional no Netlify.

ESTRUTURA DO PACOTE (OBRIGATÓRIO):
1. index.html (LANDING PAGE): Crie uma página de vendas de alta conversão para o nicho "{{niche}}". Ela deve ter um botão "Acessar Sistema" que leva para "app.html".
2. app.html (SISTEMA): Este deve ser o seu CÓDIGO ORIGINAL adaptado. Mantenha 100% da UI, Carrossel, Zoom e Admin. Substitua o localStorage pelo Supabase ({{supabase_url}}, {{supabase_key}}).
3. netlify.toml: Gere este arquivo com as regras de redirecionamento para garantir que não existam erros 404.

REGRAS DE DADOS:
- Mapeie os dados do Supabase para o formato de array do seu JS original: "data.map(item => item.name)".
- Garanta que o Admin funcione perfeitamente com as tabelas "products", "categories" e "staff".

SAÍDA: JSON com index_html (landing), app_html (sistema), supabase_sql, netlify_toml.
AVISO: O sistema deve ser "Plug and Play". O usuário deve apenas subir o ZIP no Netlify e tudo deve funcionar.`;
    
    setSettings(prev => ({ ...prev, system_prompt: defaultPrompt }));
    await handleSaveSettings("system_prompt", defaultPrompt);
    alert("🚀 Modo Netlify Ready Ativado! O ZIP agora virá com index.html (Landing) e app.html (Sistema).");
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
      let generationId: any = Date.now();
      
      try {
        if (isStaticMode) {
          const newGen = { id: generationId, niche, template_id: template.id, status: "Processando", created_at: new Date().toISOString() };
          const updated = [newGen, ...generations];
          setGenerations(updated);
          localStorage.setItem("factory_generations", JSON.stringify(updated));
        } else {
          const startRes = await fetch("/api/generations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ niche, template_id: template.id, status: "Processando" })
          });
          if (!startRes.ok) throw new Error("Falha ao iniciar geração no servidor");
          const resData = await startRes.json();
          generationId = resData.id;
          await fetchGenerations();
        }

        const prompt = settings.system_prompt
          .replace("{{niche}}", niche)
          .replace("{{supabase_url}}", factoryConfig.supabaseUrl)
          .replace("{{supabase_key}}", factoryConfig.supabaseKey);

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-latest",
          contents: [
            { role: "user", parts: [{ text: `Template Base:\n${template.content}\n\n${prompt}` }] }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                index_html: { type: Type.STRING, description: "Landing Page Content" },
                app_html: { type: Type.STRING, description: "Main App Content" },
                supabase_sql: { type: Type.STRING },
                netlify_toml: { type: Type.STRING }
              },
              required: ["index_html", "app_html", "supabase_sql", "netlify_toml"]
            }
          }
        });

        const result = JSON.parse(response.text);

        const zip = new JSZip();
        zip.file("index.html", result.index_html); // Landing Page
        zip.file("app.html", result.app_html);     // O Sistema SaaS
        zip.file("supabase-setup.sql", result.supabase_sql);
        zip.file("netlify.toml", result.netlify_toml);
        zip.file("README.md", `# SaaS Factory: ${niche}\n\nGerado automaticamente para o nicho ${niche}.\n\nPara hospedar no Netlify:\n1. Crie as tabelas no Supabase usando o arquivo SQL.\n2. Arraste esta pasta para o Netlify.`);

        const zipBase64 = await zip.generateAsync({ type: "base64" });

        if (isStaticMode) {
          setGenerations(prev => {
            const updated = prev.map(g => g.id === generationId ? { ...g, status: "Concluído", zip_base64: zipBase64 } : g);
            localStorage.setItem("factory_generations", JSON.stringify(updated));
            return updated;
          });
        } else {
          const updateRes = await fetch("/api/generations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: generationId, status: "Concluído", zip_base64: zipBase64 })
          });
          if (!updateRes.ok) throw new Error("Falha ao atualizar status no servidor");
          await fetchGenerations();
        }

      } catch (error: any) {
        console.error(`Erro no nicho ${niche}:`, error);
        const errorMsg = error.message || "IA Error";
        
        if (isStaticMode) {
          setGenerations(prev => {
            const updated = prev.map(g => g.id === generationId ? { ...g, status: "Erro: " + errorMsg } : g);
            localStorage.setItem("factory_generations", JSON.stringify(updated));
            return updated;
          });
        } else {
          try {
            await fetch("/api/generations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: generationId, status: "Erro: " + errorMsg })
            });
            await fetchGenerations();
          } catch (e) {
            console.error("Falha fatal ao reportar erro ao servidor:", e);
          }
        }
      }
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

        <div className="mt-auto flex flex-col gap-2">
          <button 
            onClick={() => setShowDeployGuide(true)}
            className="w-full flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-zinc-500 hover:text-emerald-400 transition-colors uppercase tracking-widest"
          >
            <Globe size={14} /> Como Hospedar?
          </button>
          <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${isStaticMode ? "bg-yellow-500" : "bg-emerald-500 animate-pulse"}`}></div>
              <span className="text-xs font-medium text-zinc-400">
                {isStaticMode ? "Static Mode (Netlify)" : "Full-Stack Mode"}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">
              {isStaticMode ? "Dados salvos no seu navegador." : "Conectado ao Gemini 3.1 Pro"}
            </p>
          </div>
        </div>
      </aside>

      {/* Deploy Guide Modal */}
      {showDeployGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-2xl w-full shadow-2xl"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-emerald-400">
                <Globe /> Guia de Hospedagem Netlify
              </h2>
              <button onClick={() => setShowDeployGuide(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
              <section>
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400">1</span>
                  Para o Criador (Este Painel)
                </h3>
                <p>O Netlify é estático. Ao subir este projeto, ele funcionará no <b>Modo Estático</b>. Seus templates ficam salvos no seu navegador. Use a função de <b>Exportar JSON</b> em Settings para não perder seus dados.</p>
              </section>
              
              <section className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800">
                <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400">2</span>
                  Para os SaaS Gerados (O ZIP)
                </h3>
                <p className="mb-3">O ZIP gerado (V4) é "Plug and Play" para o Netlify:</p>
                <ul className="space-y-2">
                  <li className="flex gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><b>index.html</b>: É a sua Landing Page (Página de Vendas).</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><b>app.html</b>: É o Sistema SaaS real.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><b>netlify.toml</b>: Garante que as rotas funcionem sem erros 404.</span>
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-white mb-2">Como subir?</h3>
                <p>Extraia o ZIP e arraste todos os arquivos para o <b>Netlify Drop</b>. Não esqueça de configurar o Supabase antes!</p>
              </section>
            </div>
            <button 
              onClick={() => setShowDeployGuide(false)}
              className="mt-8 w-full bg-emerald-500 text-zinc-950 font-bold py-4 rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              Entendido, vamos lá!
            </button>
          </motion.div>
        </div>
      )}

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
                      <Download size={20} className="text-emerald-400" />
                      Backup de Dados (Modo Estático)
                    </h3>
                  </div>
                  <p className="text-sm text-zinc-500 mb-6">
                    Como você está usando o Netlify (Modo Estático), seus dados ficam salvos apenas neste navegador. 
                    Exporte um backup para garantir que não perderá seus templates.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      onClick={exportData}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={18} /> Exportar Backup JSON
                    </button>
                    <label className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-center">
                      <Upload size={18} /> Importar Backup JSON
                      <input type="file" accept=".json" onChange={importData} className="hidden" />
                    </label>
                  </div>
                </section>

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
