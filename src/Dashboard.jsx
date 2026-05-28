import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import * as api from "./api";

// ── Theme ─────────────────────────────────────────────────────────────────────
const PRESETS = {
  dark:    { name:"Escuro",      bg:"#0a0b0f", surface:"#11131a", surface2:"#181b24", border:"#1f2333", accent:"#00e5ff", text:"#e2e8f0", muted:"#64748b" },
  midnight:{ name:"Meia-noite",  bg:"#060811", surface:"#0d1117", surface2:"#161b22", border:"#21262d", accent:"#7c3aed", text:"#e6edf3", muted:"#8b949e" },
  slate:   { name:"Ardósia",     bg:"#0f172a", surface:"#1e293b", surface2:"#334155", border:"#475569", accent:"#38bdf8", text:"#f1f5f9", muted:"#94a3b8" },
  light:   { name:"Claro",       bg:"#f8fafc", surface:"#ffffff", surface2:"#f1f5f9", border:"#e2e8f0", accent:"#0ea5e9", text:"#0f172a", muted:"#64748b" },
  forest:  { name:"Floresta",    bg:"#0a130f", surface:"#111a14", surface2:"#172012", border:"#1f2e1e", accent:"#4ade80", text:"#ecfdf5", muted:"#6b7280" },
  ember:   { name:"Brasa",       bg:"#100a07", surface:"#1a110c", surface2:"#221610", border:"#2e1e14", accent:"#fb923c", text:"#fef3e2", muted:"#a16207" },
};
const ACCENT_COLORS = [
  { name:"Ciano",   value:"#00e5ff" }, { name:"Violeta", value:"#7c3aed" },
  { name:"Azul",    value:"#38bdf8" }, { name:"Verde",   value:"#4ade80" },
  { name:"Laranja", value:"#fb923c" }, { name:"Rosa",    value:"#f472b6" },
  { name:"Amarelo", value:"#facc15" }, { name:"Vermelho",value:"#f87171" },
];
const FONT_OPTIONS = [
  { name:"Syne",         value:"'Syne', sans-serif",          import:"Syne:wght@400;600;700;800" },
  { name:"Inter",        value:"'Inter', sans-serif",          import:"Inter:wght@400;600;700;800" },
  { name:"Space Grotesk",value:"'Space Grotesk', sans-serif",  import:"Space+Grotesk:wght@400;600;700" },
  { name:"DM Sans",      value:"'DM Sans', sans-serif",        import:"DM+Sans:wght@400;600;700;800" },
  { name:"Outfit",       value:"'Outfit', sans-serif",         import:"Outfit:wght@400;600;700;800" },
];
const ROLES = {
  admin:    { label:"Administrador", color:"#f59e0b", perms:["telas","playlists","midias","agendamentos","usuarios","configuracoes"] },
  operator: { label:"Operador",      color:"#00e5ff", perms:["telas","playlists","midias","agendamentos"] },
  client:   { label:"Cliente",       color:"#7c3aed", perms:["telas","playlists"] },
  viewer:   { label:"Visualizador",  color:"#10b981", perms:["telas"] },
};
const PERM_LABELS = { telas:"Telas", playlists:"Playlists", midias:"Mídias", agendamentos:"Agendamentos", usuarios:"Usuários", configuracoes:"Configurações" };
const typeIcon  = { video:"▶", image:"◼", html:"</>", url:"🔗" };
const typeColor = { video:"#00e5ff", image:"#7c3aed", html:"#10b981", url:"#f59e0b" };
function makeCode() { return Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6).padEnd(6,"X"); }

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState("screens");

  // Data
  const [clients,   setClients]   = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [media,     setMedia]     = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [users,     setUsers]     = useState([]);
  const [settings,  setSettings]  = useState({});
  const [loading,   setLoading]   = useState(true);

  // UI state
  const [notification,    setNotification]    = useState(null);
  const [time,            setTime]            = useState(new Date());
  const [expandedClients, setExpandedClients] = useState({});
  const [expandedBranches,setExpandedBranches]= useState({});
  const [selectedScreen,  setSelectedScreen]  = useState(null);

  // Theme
  const [theme,         setTheme]         = useState({ ...PRESETS.dark });
  const [accentColor,   setAccentColor]   = useState("#00e5ff");
  const [fontFamily,    setFontFamily]    = useState(FONT_OPTIONS[0]);
  const [brandName,     setBrandName]     = useState("INDOORCMS");
  const [brandNameEdit, setBrandNameEdit] = useState("INDOORCMS");
  const [logoChar,      setLogoChar]      = useState("⬛");
  const [sidebarWidth,  setSidebarWidth]  = useState(200);
  const [compactMode,   setCompactMode]   = useState(false);
  const [previewPreset, setPreviewPreset] = useState(null);

  // Pair
  const [showPairModal,  setShowPairModal]  = useState(false);
  const [pairCode,       setPairCode]       = useState("");
  const [pairStep,       setPairStep]       = useState("input");
  const [pairFoundTV,    setPairFoundTV]    = useState(null);
  const [pairBranch,     setPairBranch]     = useState("");
  const [pairPlaylist,   setPairPlaylist]   = useState("");
  const [pairScreenName, setPairScreenName] = useState("");
  const [tvCode,         setTvCode]         = useState(() => makeCode());
  const [allBranches,    setAllBranches]    = useState([]);

  // Modals
  const [showTVPreview,   setShowTVPreview]   = useState(false);
  const [showNewClient,   setShowNewClient]   = useState(false);
  const [showNewBranch,   setShowNewBranch]   = useState(null);
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [showUpload,      setShowUpload]      = useState(false);
  const [showSchedule,    setShowSchedule]    = useState(false);
  const [showNewUser,     setShowNewUser]     = useState(false);
  const [editUser,        setEditUser]        = useState(null);
  const [newUser,         setNewUser]         = useState({ name:"",email:"",password:"",role:"operator",client_id:"",status:"active" });
  const [userFilter,      setUserFilter]      = useState("all");
  const [newClientData,   setNewClientData]   = useState({ name:"", cnpj:"", color:"#00e5ff" });
  const [newBranchData,   setNewBranchData]   = useState({ name:"", city:"", address:"" });
  const [newPlaylistData, setNewPlaylistData] = useState({ name:"", mode:"loop" });
  const [newScheduleData, setNewScheduleData] = useState({ playlist_id:"", target_type:"client", target_id:"", start_time:"08:00", end_time:"20:00" });
  const [uploadFile,      setUploadFile]      = useState(null);
  const [uploadProgress,  setUploadProgress]  = useState(0);

  // Playlist editor
  const [editingPlaylist,    setEditingPlaylist]    = useState(null);
  const [showPlaylistEditor, setShowPlaylistEditor] = useState(false);
  const [showAddMediaUrl,    setShowAddMediaUrl]    = useState(false);
  const [newUrlMedia,        setNewUrlMedia]        = useState({ name:"", url:"", type:"url", duration_sec:10 });

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, pl, m, sc, u, st] = await Promise.all([
        api.getClients(),
        api.getPlaylists(),
        api.getMedia(),
        api.getSchedules(),
        user.role === "admin" || user.role === "operator" ? api.getUsers() : Promise.resolve([]),
        api.getSettings(),
      ]);
      setClients(c);
      setPlaylists(pl);
      setMedia(m);
      setSchedules(sc);
      setUsers(u);
      setSettings(st);
      // Apply saved settings
      if (st.accent_color) setAccentColor(st.accent_color);
      if (st.brand_name)   { setBrandName(st.brand_name); setBrandNameEdit(st.brand_name); }
      if (st.logo_char)    setLogoChar(st.logo_char);
      if (st.theme_preset && PRESETS[st.theme_preset]) setTheme({ ...PRESETS[st.theme_preset] });
      const savedFont = FONT_OPTIONS.find(f => f.name === st.font_family);
      if (savedFont) setFontFamily(savedFont);
      // Expand first client
      if (c.length > 0) setExpandedClients({ [c[0].id]: true });
    } catch (err) {
      notify("Erro ao carregar dados.", "error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  // ── WebSocket ───────────────────────────────────────────────────────────────
  const handleWsMessage = useCallback((msg) => {
    if (msg.type === "SCREEN_STATUS") {
      setClients(prev => prev.map(c => ({
        ...c,
        branches: c.branches?.map(b => ({
          ...b,
          screens: b.screens?.map(s =>
            s.pair_code === msg.pair_code ? { ...s, status: msg.status } : s
          )
        }))
      })));
    }
    if (msg.type === "SCREEN_PAIRED") {
      loadAll();
      notify("Nova TV pareada!");
    }
  }, [loadAll]);

  useWebSocket(handleWsMessage);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };
  const toggleClient = id => setExpandedClients(p => ({ ...p, [id]: !p[id] }));
  const toggleBranch = id => setExpandedBranches(p => ({ ...p, [id]: !p[id] }));

  const allScreens  = clients.flatMap(c => (c.branches||[]).flatMap(b => b.screens||[]));
  const onlineCount = allScreens.filter(s => s.status === "online").length;

  // ── Pair ────────────────────────────────────────────────────────────────────
  const handleSearchCode = async () => {
    const clean = pairCode.trim().toUpperCase();
    if (clean.length !== 6) { notify("Insira 6 caracteres.", "error"); return; }
    try {
      const res = await api.checkPairCode(clean);
      if (res.found) {
        setPairFoundTV({ code: clean, name: "Smart TV detectada", model: "Android TV" });
        setPairStep("found");
      } else {
        notify("Código não encontrado.", "error");
      }
    } catch {
      // Demo mode: aceita o tvCode local
      if (clean === tvCode) {
        setPairFoundTV({ code: clean, name: "Smart TV detectada", model: "Android TV" });
        setPairStep("found");
      } else {
        notify("Código não encontrado.", "error");
      }
    }
  };

  const handleConfirmPair = async () => {
    if (!pairBranch || !pairPlaylist || !pairScreenName.trim()) { notify("Preencha todos os campos.", "error"); return; }
    try {
      await api.pairScreen({ pair_code: pairFoundTV.code, branch_id: pairBranch, name: pairScreenName.trim(), playlist_id: pairPlaylist });
      await loadAll();
      setPairStep("done");
      notify(`TV "${pairScreenName}" pareada!`);
      setTimeout(() => { setShowPairModal(false); setPairStep("input"); setPairCode(""); setPairFoundTV(null); setPairBranch(""); setPairPlaylist(""); setPairScreenName(""); }, 1800);
    } catch (err) {
      notify(err.response?.data?.error || "Erro ao parear.", "error");
    }
  };

  // ── CRUD handlers ───────────────────────────────────────────────────────────
  const handleCreateClient = async () => {
    if (!newClientData.name) { notify("Nome é obrigatório.", "error"); return; }
    try { await api.createClient(newClientData); await loadAll(); setShowNewClient(false); setNewClientData({ name:"",cnpj:"",color:"#00e5ff" }); notify("Cliente cadastrado!"); }
    catch (err) { notify(err.response?.data?.error || "Erro.", "error"); }
  };

  const handleCreateBranch = async () => {
    if (!newBranchData.name) { notify("Nome é obrigatório.", "error"); return; }
    try { await api.createBranch({ ...newBranchData, client_id: showNewBranch }); await loadAll(); setShowNewBranch(null); setNewBranchData({ name:"",city:"",address:"" }); notify("Filial cadastrada!"); }
    catch (err) { notify(err.response?.data?.error || "Erro.", "error"); }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistData.name) { notify("Nome é obrigatório.", "error"); return; }
    try { await api.createPlaylist(newPlaylistData); await loadAll(); setShowNewPlaylist(false); setNewPlaylistData({ name:"",mode:"loop" }); notify("Playlist criada!"); }
    catch (err) { notify(err.response?.data?.error || "Erro.", "error"); }
  };

  const handleCreateSchedule = async () => {
    const { playlist_id, target_type, target_id, start_time, end_time } = newScheduleData;
    if (!playlist_id || !target_id) { notify("Preencha todos os campos.", "error"); return; }
    const payload = { playlist_id, start_time, end_time };
    if (target_type === "client")  payload.client_id = target_id;
    if (target_type === "branch")  payload.branch_id = target_id;
    if (target_type === "screen")  payload.screen_id = target_id;
    try { await api.createSchedule(payload); await loadAll(); setShowSchedule(false); notify("Agendamento criado!"); }
    catch (err) { notify(err.response?.data?.error || "Erro.", "error"); }
  };

  const handleUpload = async () => {
    if (!uploadFile) { notify("Selecione um arquivo.", "error"); return; }
    const formData = new FormData();
    formData.append("file", uploadFile);
    try {
      await api.uploadMedia(formData, setUploadProgress);
      await loadAll(); setShowUpload(false); setUploadFile(null); setUploadProgress(0);
      notify("Upload concluído!");
    } catch (err) { notify(err.response?.data?.error || "Erro no upload.", "error"); }
  };

  const handleSaveUser = async () => {
    if (!newUser.name || !newUser.email) { notify("Nome e e-mail são obrigatórios.", "error"); return; }
    try {
      if (editUser) { await api.updateUser(editUser.id, newUser); notify("Usuário atualizado!"); }
      else          { await api.createUser(newUser); notify("Usuário cadastrado!"); }
      await loadAll(); setShowNewUser(false); setEditUser(null);
      setNewUser({ name:"",email:"",password:"",role:"operator",client_id:"",status:"active" });
    } catch (err) { notify(err.response?.data?.error || "Erro.", "error"); }
  };

  const handleDeleteUser = async (id) => {
    try { await api.deleteUser(id); await loadAll(); notify("Usuário desativado."); }
    catch (err) { notify(err.response?.data?.error || "Erro.", "error"); }
  };

  const handleSaveSettings = async (updates) => {
    try { await api.saveSettings(updates); notify("Configurações salvas!"); }
    catch { notify("Erro ao salvar.", "error"); }
  };

  const applyPreset = (key) => {
    setTheme({ ...PRESETS[key] });
    setAccentColor(PRESETS[key].accent);
    setPreviewPreset(null);
    handleSaveSettings({ theme_preset: key, accent_color: PRESETS[key].accent });
    notify(`Tema "${PRESETS[key].name}" aplicado!`);
  };

  // ── Active theme ────────────────────────────────────────────────────────────
  const activeTheme = previewPreset ? { ...PRESETS[previewPreset], accent: accentColor } : { ...theme, accent: accentColor };
  const cssVars = `:root{--bg:${activeTheme.bg};--surface:${activeTheme.surface};--surface2:${activeTheme.surface2};--border:${activeTheme.border};--accent:${activeTheme.accent};--accent2:#7c3aed;--accent3:#f59e0b;--text:${activeTheme.text};--muted:${activeTheme.muted};--green:#10b981;--red:#ef4444;--font-display:${fontFamily.value};--font-mono:'DM Mono',monospace;}body{background:var(--bg);color:var(--text);font-family:var(--font-display);}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`;
  const fontImport = `@import url('https://fonts.googleapis.com/css2?family=${fontFamily.import}&family=DM+Mono:wght@300;400;500&display=swap');`;

  const tabs = [
    { id:"screens",   label:"Telas",         icon:"⬛" },
    { id:"playlists", label:"Playlists",      icon:"≡"  },
    { id:"media",     label:"Mídias",         icon:"◈"  },
    { id:"schedule",  label:"Agendamentos",   icon:"◷"  },
    { id:"users",     label:"Usuários",       icon:"◉"  },
    { id:"customize", label:"Personalização", icon:"◐"  },
  ];

  if (loading) return (
    <div style={{ minHeight:"100vh",background:"#0a0b0f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",color:"#64748b",gap:12 }}>
      <div style={{ width:20,height:20,border:"2px solid #1f2333",borderTopColor:"#00e5ff",borderRadius:"50%",animation:"spin 1s linear infinite" }} />
      Carregando...
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",fontFamily:"var(--font-display)",color:"var(--text)" }}>
      <style>{`${fontImport}\n*{box-sizing:border-box;margin:0;padding:0;}\n${cssVars}`}</style>

      {/* Toast */}
      {notification && (
        <div style={{ position:"fixed",top:20,right:20,zIndex:9999,background:notification.type==="error"?"var(--red)":"var(--green)",color:"#fff",padding:"12px 20px",borderRadius:8,fontFamily:"var(--font-mono)",fontSize:13,fontWeight:500,boxShadow:"0 4px 20px rgba(0,0,0,.4)",animation:"fadeUp .2s ease" }}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background:"var(--surface)",borderBottom:"1px solid var(--border)",padding:"0 32px",display:"flex",alignItems:"center",justifyContent:"space-between",height:compactMode?48:60 }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:compactMode?28:32,height:compactMode?28:32,background:"var(--accent)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"#000",fontSize:compactMode?14:16,fontWeight:800 }}>{logoChar}</div>
          <span style={{ fontSize:compactMode?15:18,fontWeight:800,letterSpacing:"-0.5px" }}>
            {brandName.split("").map((ch,i)=> i<brandName.length-3 ? <span key={i}>{ch}</span> : <span key={i} style={{ color:"var(--accent)" }}>{ch}</span>)}
          </span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:20 }}>
          <button onClick={()=>setShowTVPreview(true)} style={{ background:"rgba(0,229,255,.08)",border:"1px solid rgba(0,229,255,.2)",color:"var(--accent)",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,fontFamily:"var(--font-display)",cursor:"pointer" }}>▶ Ver tela da TV</button>
          <div style={{ display:"flex",gap:6,alignItems:"center",fontFamily:"var(--font-mono)",fontSize:13,color:"var(--muted)" }}>
            <span style={{ width:8,height:8,borderRadius:"50%",background:"var(--green)",display:"inline-block" }} />
            {onlineCount}/{allScreens.length} online
          </div>
          <div style={{ fontFamily:"var(--font-mono)",fontSize:13,color:"var(--muted)" }}>{time.toLocaleTimeString("pt-BR")}</div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:12,color:"var(--muted)",fontFamily:"var(--font-mono)" }}>{user.name}</span>
            <button onClick={onLogout} style={{ background:"transparent",border:"1px solid var(--border)",borderRadius:6,padding:"5px 10px",fontSize:11,color:"var(--muted)",fontFamily:"var(--font-display)",cursor:"pointer" }}>Sair</button>
          </div>
        </div>
      </div>

      <div style={{ display:"flex",height:`calc(100vh - ${compactMode?48:60}px)` }}>
        {/* Sidebar */}
        <div style={{ width:sidebarWidth,background:"var(--surface)",borderRight:"1px solid var(--border)",padding:"24px 0",display:"flex",flexDirection:"column",gap:4,flexShrink:0 }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:"flex",alignItems:"center",gap:10,padding:compactMode?"8px 16px":"10px 20px",background:tab===t.id?"var(--surface2)":"transparent",border:"none",borderLeft:tab===t.id?"2px solid var(--accent)":"2px solid transparent",color:tab===t.id?"var(--accent)":"var(--muted)",fontSize:compactMode?12:14,fontWeight:600,fontFamily:"var(--font-display)",cursor:"pointer",textAlign:"left",transition:"all .15s",whiteSpace:"nowrap",overflow:"hidden" }}>
              <span style={{ fontSize:14,flexShrink:0 }}>{t.icon}</span>
              {sidebarWidth>120 && t.label}
            </button>
          ))}
          <div style={{ flex:1 }} />
          <div style={{ padding:"16px 20px",borderTop:"1px solid var(--border)" }}>
            {sidebarWidth>120 && <>
              <div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)",marginBottom:8 }}>ARMAZENAMENTO</div>
              <div style={{ height:4,background:"var(--border)",borderRadius:99,overflow:"hidden" }}>
                <div style={{ width:"62%",height:"100%",background:"linear-gradient(90deg,var(--accent2),var(--accent))",borderRadius:99 }} />
              </div>
              <div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)",marginTop:4 }}>6.2 GB / 10 GB</div>
            </>}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1,overflowY:"auto",padding:compactMode?"20px 24px":"28px 32px" }}>

          {/* ══ TELAS ══════════════════════════════════════════════════════════ */}
          {tab==="screens" && (
            <div>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                <div>
                  <h1 style={{ fontSize:22,fontWeight:800 }}>Clientes & Filiais</h1>
                  <div style={{ fontSize:12,fontFamily:"var(--font-mono)",color:"var(--muted)",marginTop:2 }}>
                    {clients.length} clientes · {clients.reduce((a,c)=>a+(c.branches?.length||0),0)} filiais · {allScreens.length} telas
                  </div>
                </div>
                <div style={{ display:"flex",gap:10 }}>
                  <button onClick={async()=>{
                    setShowPairModal(true);setPairStep("input");setPairCode("");
                    try {
                      const bs = await api.getBranches();
                      setAllBranches(bs);
                    } catch { setAllBranches([]); }
                  }} style={BP}>⊕ Adicionar TV</button>
                  <button onClick={()=>setShowNewClient(true)} style={BS}>+ Novo cliente</button>
                </div>
              </div>

              <div style={{ display:"flex",flexDirection:"column",gap:12,marginTop:20 }}>
                {clients.map(client=>(
                  <div key={client.id} style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden" }}>
                    <div onClick={()=>toggleClient(client.id)} style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 20px",cursor:"pointer",borderBottom:expandedClients[client.id]?"1px solid var(--border)":"none" }}>
                      <div style={{ width:36,height:36,borderRadius:8,flexShrink:0,background:`${client.color||"#00e5ff"}18`,border:`1px solid ${client.color||"#00e5ff"}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:client.color||"#00e5ff",fontWeight:800 }}>{client.name.charAt(0)}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800,fontSize:15 }}>{client.name}</div>
                        <div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)",marginTop:1 }}>
                          {client.branch_count||0} filiais · {client.screen_count||0} telas · <span style={{ color:"var(--green)" }}>{client.online_count||0} online</span>
                        </div>
                      </div>
                      <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                        <button onClick={e=>{e.stopPropagation();setShowNewBranch(client.id);}} style={BX}>+ Filial</button>
                        <span style={{ color:"var(--muted)",fontSize:14,display:"inline-block",transform:expandedClients[client.id]?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s" }}>▾</span>
                      </div>
                    </div>
                    {expandedClients[client.id] && (
                      <ClientBranches clientId={client.id} playlists={playlists} expandedBranches={expandedBranches} toggleBranch={toggleBranch} selectedScreen={selectedScreen} setSelectedScreen={setSelectedScreen} notify={notify} loadAll={loadAll} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ PLAYLISTS ══════════════════════════════════════════════════════ */}
          {tab==="playlists" && !showPlaylistEditor && (
            <div>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
                <h1 style={{ fontSize:22,fontWeight:800 }}>Playlists</h1>
                <button onClick={()=>setShowNewPlaylist(true)} style={BP}>+ Nova playlist</button>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {playlists.map(p=>(
                  <div key={p.id} style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 20px",display:"flex",alignItems:"center",gap:20 }}>
                    <div style={{ width:40,height:40,borderRadius:8,background:p.active?"rgba(0,229,255,.1)":"var(--bg)",border:`1px solid ${p.active?"var(--accent)":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:p.active?"var(--accent)":"var(--muted)" }}>≡</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700,fontSize:15 }}>{p.name}</div>
                      <div style={{ fontSize:12,color:"var(--muted)",marginTop:2,fontFamily:"var(--font-mono)" }}>
                        {p.item_count||0} itens · {Math.floor((p.total_duration_sec||0)/60)}m {(p.total_duration_sec||0)%60}s · {p.screen_count||0} tela(s)
                      </div>
                    </div>
                    <Chip label={p.active?"● ativa":"pausada"} color={p.active?"var(--green)":"var(--muted)"} />
                    <div style={{ display:"flex",gap:8 }}>
                      <button onClick={async()=>{
                        try {
                          const full = await api.getPlaylist(p.id);
                          setEditingPlaylist(full);
                          setShowPlaylistEditor(true);
                        } catch { notify("Erro ao abrir playlist.","error"); }
                      }} style={BX}>✏ Editar</button>
                      <button onClick={async()=>{ try{ await api.updatePlaylist(p.id,{...p,active:!p.active}); await loadAll(); notify("Atualizado!"); }catch{notify("Erro.","error");} }} style={BX}>{p.active?"Pausar":"Ativar"}</button>
                      <button onClick={async()=>{ try{ await api.deletePlaylist(p.id); await loadAll(); notify("Removida!"); }catch{notify("Erro.","error");} }} style={{ ...BX,color:"var(--red)",borderColor:"rgba(239,68,68,.3)" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
              {showNewPlaylist && (
                <Modal title="Nova playlist" onClose={()=>setShowNewPlaylist(false)}>
                  <Label>NOME</Label>
                  <input value={newPlaylistData.name} onChange={e=>setNewPlaylistData(p=>({...p,name:e.target.value}))} placeholder="Nome da playlist" style={IN} />
                  <Label>TIPO</Label>
                  <select value={newPlaylistData.mode} onChange={e=>setNewPlaylistData(p=>({...p,mode:e.target.value}))} style={IN}>
                    <option value="loop">Loop contínuo</option>
                    <option value="scheduled">Agendada</option>
                    <option value="manual">Manual</option>
                  </select>
                  <button onClick={handleCreatePlaylist} style={{ ...BP,width:"100%",marginTop:8 }}>Criar playlist</button>
                </Modal>
              )}
            </div>
          )}

          {/* ══ EDITOR DE PLAYLIST ══════════════════════════════════════════════ */}
          {tab==="playlists" && showPlaylistEditor && editingPlaylist && (
            <div>
              <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:24 }}>
                <button onClick={()=>{ setShowPlaylistEditor(false); setEditingPlaylist(null); loadAll(); }} style={{ ...BX,display:"flex",alignItems:"center",gap:6 }}>← Voltar</button>
                <div>
                  <h1 style={{ fontSize:22,fontWeight:800 }}>{editingPlaylist.name}</h1>
                  <div style={{ fontSize:12,fontFamily:"var(--font-mono)",color:"var(--muted)",marginTop:2 }}>
                    {(editingPlaylist.items||[]).length} itens · clique em "+ Adicionar mídia" para incluir conteúdo
                  </div>
                </div>
              </div>

              {/* Itens da playlist */}
              <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:20 }}>
                {(editingPlaylist.items||[]).length === 0 && (
                  <div style={{ background:"var(--surface2)",border:"2px dashed var(--border)",borderRadius:12,padding:"40px",textAlign:"center",color:"var(--muted)",fontSize:14 }}>
                    <div style={{ fontSize:32,marginBottom:8 }}>🎬</div>
                    Playlist vazia — adicione vídeos, imagens ou URLs abaixo
                  </div>
                )}
                {(editingPlaylist.items||[]).map((item, idx) => (
                  <div key={item.id} style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:14 }}>
                    <div style={{ width:32,height:32,borderRadius:6,background:`${typeColor[item.media_type]||"#888"}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:typeColor[item.media_type]||"#888",flexShrink:0 }}>
                      {typeIcon[item.media_type]||"◼"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13,fontWeight:700 }}>{item.media_name}</div>
                      <div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)",marginTop:2 }}>
                        {item.media_type} · {item.duration_sec}s exibição
                      </div>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)" }}>#{idx+1}</span>
                      <button onClick={async()=>{
                        try {
                          await api.deletePlaylist(editingPlaylist.id + "/items/" + item.id);
                        } catch {}
                        // Remove localmente
                        setEditingPlaylist(p=>({...p, items: p.items.filter(i=>i.id!==item.id)}));
                        notify("Item removido!");
                      }} style={{ ...BX,color:"var(--red)",borderColor:"rgba(239,68,68,.3)" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botões de ação */}
              <div style={{ display:"flex",gap:10 }}>
                <button onClick={()=>setShowAddMediaUrl(true)} style={BP}>+ Da biblioteca</button>
                <button onClick={()=>setShowAddMediaUrl("url")} style={BS}>+ Por URL</button>
              </div>

              {/* Modal — escolher da biblioteca */}
              {showAddMediaUrl === true && (
                <Modal title="Adicionar da biblioteca" onClose={()=>setShowAddMediaUrl(false)}>
                  {media.length === 0 ? (
                    <div style={{ textAlign:"center",padding:"20px 0",color:"var(--muted)",fontSize:13 }}>
                      Nenhuma mídia na biblioteca ainda.<br/>
                      <span style={{ fontSize:12 }}>Use "Por URL" para adicionar conteúdo.</span>
                    </div>
                  ) : (
                    <div style={{ display:"flex",flexDirection:"column",gap:8,maxHeight:360,overflowY:"auto" }}>
                      {media.map(m=>{
                        const alreadyAdded = (editingPlaylist.items||[]).some(i=>i.media_id===m.id);
                        return (
                          <div key={m.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"var(--bg)",borderRadius:8,border:`1px solid ${alreadyAdded?"var(--accent)":"var(--border)"}` }}>
                            <div style={{ width:32,height:32,borderRadius:6,background:`${typeColor[m.type]||"#888"}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:typeColor[m.type]||"#888",flexShrink:0 }}>
                              {typeIcon[m.type]||"◼"}
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:13,fontWeight:600 }}>{m.name}</div>
                              <div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)" }}>{m.type}</div>
                            </div>
                            {alreadyAdded ? (
                              <span style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--accent)" }}>✓ adicionada</span>
                            ) : (
                              <button onClick={async()=>{
                                try {
                                  await api.addMediaToPlaylist(editingPlaylist.id, { media_id:m.id, duration_sec:10 });
                                  const updated = await api.getPlaylist(editingPlaylist.id);
                                  setEditingPlaylist(updated);
                                  notify(`"${m.name}" adicionada!`);
                                } catch(err) { notify(err.response?.data?.error||"Erro.","error"); }
                              }} style={BP}>+ Adicionar</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Modal>
              )}

              {/* Modal — adicionar por URL */}
              {showAddMediaUrl === "url" && (
                <Modal title="Adicionar mídia por URL" onClose={()=>setShowAddMediaUrl(false)}>
                  <div style={{ background:"rgba(0,229,255,.05)",border:"1px solid rgba(0,229,255,.15)",borderRadius:8,padding:"12px 14px",fontSize:12,color:"var(--muted)",marginBottom:4,lineHeight:1.6 }}>
                    💡 Cole um link direto para um vídeo MP4, imagem, ou página web.
                  </div>
                  <Label>NOME DA MÍDIA</Label>
                  <input value={newUrlMedia.name} onChange={e=>setNewUrlMedia(p=>({...p,name:e.target.value}))} placeholder="Ex: Vídeo Institucional" style={IN} />
                  <Label>URL</Label>
                  <input value={newUrlMedia.url} onChange={e=>setNewUrlMedia(p=>({...p,url:e.target.value}))} placeholder="https://..." style={IN} />
                  <Label>TIPO</Label>
                  <select value={newUrlMedia.type} onChange={e=>setNewUrlMedia(p=>({...p,type:e.target.value}))} style={IN}>
                    <option value="video">Vídeo (MP4)</option>
                    <option value="image">Imagem</option>
                    <option value="url">URL / Página web</option>
                    <option value="html">HTML</option>
                  </select>
                  <Label>TEMPO DE EXIBIÇÃO (segundos)</Label>
                  <input type="number" value={newUrlMedia.duration_sec} onChange={e=>setNewUrlMedia(p=>({...p,duration_sec:parseInt(e.target.value)||10}))} style={IN} min={1} />
                  <button onClick={async()=>{
                    if (!newUrlMedia.name||!newUrlMedia.url) { notify("Preencha nome e URL.","error"); return; }
                    try {
                      const mediaItem = await api.addMediaUrl({ name:newUrlMedia.name, url:newUrlMedia.url, type:newUrlMedia.type, duration_sec:newUrlMedia.duration_sec });
                      await api.addMediaToPlaylist(editingPlaylist.id, { media_id:mediaItem.id, duration_sec:newUrlMedia.duration_sec });
                      const updated = await api.getPlaylist(editingPlaylist.id);
                      setEditingPlaylist(updated);
                      setShowAddMediaUrl(false);
                      setNewUrlMedia({ name:"", url:"", type:"url", duration_sec:10 });
                      notify("Mídia adicionada!");
                    } catch(err) { notify(err.response?.data?.error||"Erro ao adicionar.","error"); }
                  }} style={{ ...BP,width:"100%",marginTop:8 }}>Adicionar à playlist</button>
                </Modal>
              )}
            </div>
          )}

          {/* ══ MÍDIAS ═════════════════════════════════════════════════════════ */}
          {tab==="media" && (
            <div>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
                <h1 style={{ fontSize:22,fontWeight:800 }}>Biblioteca de Mídias</h1>
                <div style={{ display:"flex",gap:10 }}>
                  <button onClick={()=>notify("Em breve!")} style={BS}>+ URL / HTML</button>
                  <button onClick={()=>setShowUpload(true)} style={BP}>↑ Upload</button>
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:14 }}>
                {media.map(m=>(
                  <div key={m.id} style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",cursor:"pointer" }}>
                    <div style={{ height:110,background:`${typeColor[m.type]||"#888"}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,color:typeColor[m.type]||"#888",borderBottom:"1px solid var(--border)" }}>{typeIcon[m.type]||"◼"}</div>
                    <div style={{ padding:"10px 12px" }}>
                      <div style={{ fontSize:12,fontWeight:600,marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{m.name}</div>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                        <Chip label={m.type} color={typeColor[m.type]||"#888"} />
                        <button onClick={async()=>{ try{ await api.deleteMedia(m.id); await loadAll(); notify("Removida!"); }catch{notify("Erro.","error");} }} style={{ background:"transparent",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:12 }}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {showUpload && (
                <Modal title="Upload de Mídia" onClose={()=>setShowUpload(false)}>
                  <div onClick={()=>document.getElementById("fileInput").click()} style={{ border:"2px dashed var(--border)",borderRadius:10,padding:"32px",textAlign:"center",color:"var(--muted)",fontSize:14,cursor:"pointer",marginBottom:12 }}>
                    <div style={{ fontSize:32,marginBottom:8 }}>↑</div>
                    {uploadFile ? uploadFile.name : "Clique para selecionar"}
                    <div style={{ fontSize:11,fontFamily:"var(--font-mono)",marginTop:6 }}>JPG, PNG, MP4, HTML</div>
                    <input id="fileInput" type="file" style={{ display:"none" }} onChange={e=>setUploadFile(e.target.files[0])} accept=".jpg,.jpeg,.png,.gif,.mp4,.webm,.html" />
                  </div>
                  {uploadProgress > 0 && (
                    <div style={{ height:4,background:"var(--border)",borderRadius:99,overflow:"hidden",marginBottom:8 }}>
                      <div style={{ width:`${uploadProgress}%`,height:"100%",background:"var(--accent)",borderRadius:99,transition:"width .3s" }} />
                    </div>
                  )}
                  <button onClick={handleUpload} style={{ ...BP,width:"100%" }}>Enviar arquivo</button>
                </Modal>
              )}
            </div>
          )}

          {/* ══ AGENDAMENTOS ═══════════════════════════════════════════════════ */}
          {tab==="schedule" && (
            <div>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
                <h1 style={{ fontSize:22,fontWeight:800 }}>Agendamentos</h1>
                <button onClick={()=>setShowSchedule(true)} style={BP}>+ Novo agendamento</button>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {schedules.map(s=>(
                  <div key={s.id} style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 20px",display:"grid",gridTemplateColumns:"10px 1fr 1fr auto auto auto",alignItems:"center",gap:16 }}>
                    <div style={{ width:10,height:10,borderRadius:"50%",background:s.active?"var(--green)":"var(--muted)" }} />
                    <div><div style={{ fontWeight:700,fontSize:14 }}>{s.playlist_name}</div><div style={{ fontSize:11,color:"var(--muted)",fontFamily:"var(--font-mono)" }}>playlist</div></div>
                    <div><div style={{ fontSize:13 }}>{s.client_name||s.branch_name||s.screen_name||"—"}</div><div style={{ fontSize:11,color:"var(--muted)",fontFamily:"var(--font-mono)" }}>destino</div></div>
                    <div><div style={{ fontSize:13,fontFamily:"var(--font-mono)" }}>{s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}</div><div style={{ fontSize:11,color:"var(--muted)" }}>horário</div></div>
                    <button onClick={async()=>{ try{ await api.toggleSchedule(s.id); await loadAll(); notify("Atualizado!"); }catch{notify("Erro.","error");} }} style={BX}>{s.active?"Pausar":"Ativar"}</button>
                    <button onClick={async()=>{ try{ await api.deleteSchedule(s.id); await loadAll(); notify("Removido!"); }catch{notify("Erro.","error");} }} style={{ ...BX,color:"var(--red)",borderColor:"rgba(239,68,68,.3)" }}>✕</button>
                  </div>
                ))}
              </div>
              {showSchedule && (
                <Modal title="Novo agendamento" onClose={()=>setShowSchedule(false)}>
                  <Label>PLAYLIST</Label>
                  <select value={newScheduleData.playlist_id} onChange={e=>setNewScheduleData(p=>({...p,playlist_id:e.target.value}))} style={IN}>
                    <option value="">— Selecione —</option>
                    {playlists.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <Label>TIPO DE DESTINO</Label>
                  <select value={newScheduleData.target_type} onChange={e=>setNewScheduleData(p=>({...p,target_type:e.target.value,target_id:""}))} style={IN}>
                    <option value="client">Por cliente</option>
                    <option value="branch">Por filial</option>
                    <option value="screen">Por tela</option>
                  </select>
                  <Label>DESTINO</Label>
                  <select value={newScheduleData.target_id} onChange={e=>setNewScheduleData(p=>({...p,target_id:e.target.value}))} style={IN}>
                    <option value="">— Selecione —</option>
                    {newScheduleData.target_type==="client" && clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    {newScheduleData.target_type==="branch" && clients.flatMap(c=>(c.branches||[]).map(b=><option key={b.id} value={b.id}>{b.name} ({c.name})</option>))}
                    {newScheduleData.target_type==="screen" && allScreens.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                    <div><Label>INÍCIO</Label><input type="time" value={newScheduleData.start_time} onChange={e=>setNewScheduleData(p=>({...p,start_time:e.target.value}))} style={IN} /></div>
                    <div><Label>FIM</Label><input type="time" value={newScheduleData.end_time} onChange={e=>setNewScheduleData(p=>({...p,end_time:e.target.value}))} style={IN} /></div>
                  </div>
                  <button onClick={handleCreateSchedule} style={{ ...BP,width:"100%",marginTop:8 }}>Criar agendamento</button>
                </Modal>
              )}
            </div>
          )}

          {/* ══ USUÁRIOS ═══════════════════════════════════════════════════════ */}
          {tab==="users" && (
            <div>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                <div>
                  <h1 style={{ fontSize:22,fontWeight:800 }}>Usuários</h1>
                  <div style={{ fontSize:12,fontFamily:"var(--font-mono)",color:"var(--muted)",marginTop:2 }}>{users.length} usuários · {users.filter(u=>u.status==="active").length} ativos</div>
                </div>
                <button onClick={()=>{setEditUser(null);setNewUser({name:"",email:"",password:"",role:"operator",client_id:"",status:"active"});setShowNewUser(true);}} style={BP}>+ Novo usuário</button>
              </div>
              <div style={{ display:"flex",gap:8,margin:"20px 0 16px" }}>
                {[["all","Todos"],["admin","Admin"],["operator","Operador"],["client","Cliente"],["viewer","Visualizador"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setUserFilter(k)} style={{ background:userFilter===k?"var(--accent)":"var(--surface2)",color:userFilter===k?"#000":"var(--muted)",border:`1px solid ${userFilter===k?"var(--accent)":"var(--border)"}`,borderRadius:99,padding:"5px 14px",fontSize:12,fontWeight:600,fontFamily:"var(--font-display)",cursor:"pointer" }}>{l}</button>
                ))}
              </div>
              <div style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden" }}>
                <div style={{ display:"grid",gridTemplateColumns:"40px 1fr 1fr auto auto auto auto",gap:16,padding:"10px 20px",borderBottom:"1px solid var(--border)",fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)" }}>
                  <span/><span>NOME</span><span>CLIENTE</span><span>FUNÇÃO</span><span>STATUS</span><span>DESDE</span><span/>
                </div>
                {(userFilter==="all"?users:users.filter(u=>u.role===userFilter)).map((u,i,arr)=>(
                  <div key={u.id} style={{ display:"grid",gridTemplateColumns:"40px 1fr 1fr auto auto auto auto",gap:16,padding:"12px 20px",alignItems:"center",borderBottom:i<arr.length-1?"1px solid var(--border)":"none" }}>
                    <div style={{ width:34,height:34,borderRadius:"50%",background:`${ROLES[u.role]?.color||"#888"}20`,border:`1px solid ${ROLES[u.role]?.color||"#888"}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:ROLES[u.role]?.color||"#888" }}>{u.name?.charAt(0)?.toUpperCase()}</div>
                    <div><div style={{ fontSize:13,fontWeight:700 }}>{u.name}</div><div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)" }}>{u.email}</div></div>
                    <div style={{ fontSize:12,color:"var(--muted)",fontFamily:"var(--font-mono)" }}>{u.client_name||"—"}</div>
                    <Chip label={ROLES[u.role]?.label||u.role} color={ROLES[u.role]?.color||"#888"} />
                    <Chip label={u.status==="active"?"● ativo":"inativo"} color={u.status==="active"?"var(--green)":"var(--muted)"} />
                    <span style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)" }}>{u.created_at?.slice(0,10)}</span>
                    <div style={{ display:"flex",gap:6 }}>
                      <button onClick={()=>{setEditUser(u);setNewUser({name:u.name,email:u.email,password:"",role:u.role,client_id:u.client_id||"",status:u.status});setShowNewUser(true);}} style={BX}>Editar</button>
                      <button onClick={()=>handleDeleteUser(u.id)} style={{ ...BX,color:"var(--red)",borderColor:"rgba(239,68,68,.3)" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
              {showNewUser && (
                <Modal title={editUser?"Editar usuário":"Novo usuário"} onClose={()=>{setShowNewUser(false);setEditUser(null);}}>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                    <div><Label>NOME</Label><input value={newUser.name} onChange={e=>setNewUser(p=>({...p,name:e.target.value}))} placeholder="Nome completo" style={IN} /></div>
                    <div><Label>E-MAIL</Label><input value={newUser.email} onChange={e=>setNewUser(p=>({...p,email:e.target.value}))} placeholder="email@exemplo.com" style={IN} /></div>
                  </div>
                  {!editUser && <><Label>SENHA</Label><input type="password" value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} placeholder="Mínimo 6 caracteres" style={IN} /></>}
                  <Label>FUNÇÃO</Label>
                  <select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))} style={IN}>
                    {Object.entries(ROLES).map(([k,r])=><option key={k} value={k}>{r.label}</option>)}
                  </select>
                  {newUser.role==="client" && (
                    <><Label>CLIENTE VINCULADO</Label>
                    <select value={newUser.client_id} onChange={e=>setNewUser(p=>({...p,client_id:e.target.value}))} style={IN}>
                      <option value="">— Selecione —</option>
                      {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select></>
                  )}
                  <div style={{ background:"var(--bg)",borderRadius:8,padding:12 }}>
                    <div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)",marginBottom:8 }}>PERMISSÕES</div>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                      {Object.keys(PERM_LABELS).map(p=>{ const has=ROLES[newUser.role]?.perms?.includes(p); return <span key={p} style={{ fontSize:11,fontFamily:"var(--font-mono)",padding:"3px 8px",borderRadius:6,background:has?"rgba(16,185,129,.12)":"rgba(100,116,139,.08)",color:has?"var(--green)":"var(--muted)",border:`1px solid ${has?"rgba(16,185,129,.2)":"var(--border)"}` }}>{has?"✓":""} {PERM_LABELS[p]}</span>; })}
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:10,marginTop:4 }}>
                    <button onClick={()=>{setShowNewUser(false);setEditUser(null);}} style={{ ...BS,flex:1 }}>Cancelar</button>
                    <button onClick={handleSaveUser} style={{ ...BP,flex:2 }}>{editUser?"Salvar":"Cadastrar"}</button>
                  </div>
                </Modal>
              )}
            </div>
          )}

          {/* ══ PERSONALIZAÇÃO ═════════════════════════════════════════════════ */}
          {tab==="customize" && (
            <div>
              <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:22,fontWeight:800 }}>Personalização</h1>
                <div style={{ fontSize:12,fontFamily:"var(--font-mono)",color:"var(--muted)",marginTop:2 }}>Alterações salvas automaticamente na API</div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
                <div style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,padding:20 }}>
                  <SectionTitle>TEMAS PREDEFINIDOS</SectionTitle>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                    {Object.entries(PRESETS).map(([key,p])=>(
                      <div key={key} onMouseEnter={()=>setPreviewPreset(key)} onMouseLeave={()=>setPreviewPreset(null)} onClick={()=>applyPreset(key)} style={{ background:p.surface2,border:`2px solid ${theme.bg===p.bg?"var(--accent)":p.border}`,borderRadius:10,padding:12,cursor:"pointer",transition:"border-color .15s" }}>
                        <div style={{ display:"flex",gap:6,marginBottom:8 }}>{[p.bg,p.surface,p.accent].map((c,i)=><div key={i} style={{ flex:1,height:14,borderRadius:4,background:c }} />)}</div>
                        <div style={{ fontSize:12,fontWeight:700,color:p.text }}>{p.name}</div>
                        <div style={{ fontSize:10,fontFamily:"var(--font-mono)",color:p.muted,marginTop:2 }}>{theme.bg===p.bg?"✓ aplicado":"hover para ver"}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,padding:20 }}>
                  <SectionTitle>COR DE DESTAQUE</SectionTitle>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16 }}>
                    {ACCENT_COLORS.map(c=>(
                      <button key={c.value} onClick={()=>{setAccentColor(c.value);handleSaveSettings({accent_color:c.value});notify(`Cor "${c.name}" aplicada!`);}} style={{ background:`${c.value}18`,border:`2px solid ${accentColor===c.value?c.value:"transparent"}`,borderRadius:8,padding:"10px 0",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
                        <div style={{ width:24,height:24,borderRadius:"50%",background:c.value }} />
                        <span style={{ fontSize:10,fontFamily:"var(--font-mono)",color:accentColor===c.value?c.value:"var(--muted)" }}>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,padding:20 }}>
                  <SectionTitle>TIPOGRAFIA</SectionTitle>
                  <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                    {FONT_OPTIONS.map(f=>(
                      <button key={f.name} onClick={()=>{setFontFamily(f);handleSaveSettings({font_family:f.name});notify(`Fonte "${f.name}" aplicada!`);}} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:fontFamily.name===f.name?"rgba(0,229,255,.06)":"var(--bg)",border:`1px solid ${fontFamily.name===f.name?"var(--accent)":"var(--border)"}`,borderRadius:8,padding:"10px 14px",cursor:"pointer",textAlign:"left" }}>
                        <span style={{ fontSize:16,color:fontFamily.name===f.name?"var(--accent)":"var(--text)",fontWeight:600 }}>{f.name}</span>
                        <span style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)" }}>{fontFamily.name===f.name?"✓ ativa":""}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
                  <div style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,padding:20 }}>
                    <SectionTitle>IDENTIDADE DA MARCA</SectionTitle>
                    <Label>NOME DO SISTEMA</Label>
                    <div style={{ display:"flex",gap:8,marginBottom:14 }}>
                      <input value={brandNameEdit} onChange={e=>setBrandNameEdit(e.target.value.toUpperCase().slice(0,12))} style={{ ...IN,flex:1,fontFamily:"var(--font-mono)",letterSpacing:2,fontWeight:700 }} />
                      <button onClick={()=>{setBrandName(brandNameEdit||"INDOORCMS");handleSaveSettings({brand_name:brandNameEdit||"INDOORCMS"});notify("Nome atualizado!");}} style={BP}>Aplicar</button>
                    </div>
                    <Label>ÍCONE</Label>
                    <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                      {["⬛","◈","▶","◉","⊕","◐","⬡","▣"].map(ch=>(
                        <button key={ch} onClick={()=>{setLogoChar(ch);handleSaveSettings({logo_char:ch});notify("Ícone atualizado!");}} style={{ width:36,height:36,borderRadius:6,background:logoChar===ch?"var(--accent)":"var(--bg)",border:`1px solid ${logoChar===ch?"var(--accent)":"var(--border)"}`,color:logoChar===ch?"#000":"var(--text)",fontSize:16,cursor:"pointer" }}>{ch}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:12,padding:20 }}>
                    <SectionTitle>LAYOUT</SectionTitle>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                      <Label>LARGURA DA SIDEBAR</Label>
                      <span style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--accent)" }}>{sidebarWidth}px</span>
                    </div>
                    <input type="range" min={52} max={260} value={sidebarWidth} onChange={e=>setSidebarWidth(Number(e.target.value))} style={{ width:"100%",accentColor:"var(--accent)",cursor:"pointer",marginBottom:14 }} />
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--bg)",borderRadius:8,padding:"10px 14px" }}>
                      <div><div style={{ fontSize:13,fontWeight:600 }}>Modo compacto</div><div style={{ fontSize:11,color:"var(--muted)",fontFamily:"var(--font-mono)" }}>Reduz espaçamentos</div></div>
                      <button onClick={()=>setCompactMode(p=>!p)} style={{ width:44,height:24,borderRadius:12,background:compactMode?"var(--accent)":"var(--border)",border:"none",cursor:"pointer",position:"relative",transition:"background .2s" }}>
                        <div style={{ width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:compactMode?23:3,transition:"left .2s" }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODAL PAREAR TV ════════════════════════════════════════════════════ */}
      {showPairModal && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:16,padding:32,width:460,maxWidth:"92vw",animation:"fadeUp .2s ease" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24 }}>
              <div><h2 style={{ fontSize:18,fontWeight:800 }}>Adicionar TV</h2>
              <p style={{ fontSize:12,fontFamily:"var(--font-mono)",color:"var(--muted)",marginTop:3 }}>
                {pairStep==="input"&&"Digite o código exibido na Smart TV"}
                {pairStep==="found"&&"TV encontrada — conclua o cadastro"}
                {pairStep==="done"&&"Pareamento concluído!"}
              </p></div>
              <button onClick={()=>setShowPairModal(false)} style={{ background:"transparent",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:20 }}>✕</button>
            </div>
            {pairStep==="input" && (
              <div>
                <div style={{ background:"rgba(0,229,255,.05)",border:"1px solid rgba(0,229,255,.15)",borderRadius:10,padding:"14px 16px",marginBottom:20,display:"flex",gap:12 }}>
                  <span style={{ fontSize:22 }}>📺</span>
                  <div style={{ fontSize:12,color:"var(--muted)",lineHeight:1.6 }}>Abra o app <strong style={{ color:"var(--text)" }}>IndoorCMS</strong> na Smart TV. O código de 6 caracteres aparecerá na tela inicial.</div>
                </div>
                <Label>CÓDIGO DA TV</Label>
                <input value={pairCode} onChange={e=>setPairCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6))} placeholder="Ex: A3F7X2" maxLength={6} style={{ ...IN,fontSize:28,fontWeight:800,letterSpacing:8,textAlign:"center",padding:"16px",border:pairCode.length===6?"1px solid var(--accent)":"1px solid var(--border)" }} />
                <div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)",marginTop:6,textAlign:"center" }}>{pairCode.length}/6</div>
                <button onClick={handleSearchCode} disabled={pairCode.length!==6} style={{ ...BP,width:"100%",marginTop:16,fontSize:14,padding:"12px",opacity:pairCode.length===6?1:.4 }}>Buscar TV →</button>
                <div style={{ marginTop:12,textAlign:"center",fontSize:12,color:"var(--muted)",fontFamily:"var(--font-mono)" }}>💡 Teste com <span style={{ color:"var(--accent)",cursor:"pointer" }} onClick={()=>setPairCode(tvCode)}>{tvCode}</span></div>
              </div>
            )}
            {pairStep==="found" && pairFoundTV && (
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div style={{ background:"rgba(16,185,129,.07)",border:"1px solid rgba(16,185,129,.25)",borderRadius:10,padding:"14px 16px",display:"flex",gap:14,alignItems:"center" }}>
                  <div style={{ width:44,height:44,borderRadius:8,background:"rgba(16,185,129,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>📺</div>
                  <div style={{ flex:1 }}><div style={{ fontWeight:700,fontSize:14 }}>{pairFoundTV.name}</div><div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)" }}>{pairFoundTV.model}</div></div>
                  <div style={{ textAlign:"right" }}><div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)" }}>código</div><div style={{ fontSize:16,fontWeight:800,letterSpacing:3,color:"var(--accent)" }}>{pairFoundTV.code}</div></div>
                </div>
                <div><Label>NOME DA TELA</Label><input value={pairScreenName} onChange={e=>setPairScreenName(e.target.value)} placeholder="Ex: Vitrine Principal" style={IN} /></div>
                <div><Label>FILIAL</Label>
                  <select value={pairBranch} onChange={e=>setPairBranch(e.target.value)} style={IN}>
                    <option value="">— Selecione a filial —</option>
                    {allBranches.map(b=>(
                      <option key={b.id} value={b.id}>{b.name} {b.city ? `· ${b.city}` : ""}</option>
                    ))}
                  </select>
                </div>
                <div><Label>PLAYLIST INICIAL</Label>
                  <select value={pairPlaylist} onChange={e=>setPairPlaylist(e.target.value)} style={IN}>
                    <option value="">— Selecione —</option>
                    {playlists.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex",gap:10,marginTop:4 }}>
                  <button onClick={()=>setPairStep("input")} style={{ ...BS,flex:1 }}>← Voltar</button>
                  <button onClick={handleConfirmPair} style={{ ...BP,flex:2,fontSize:14 }}>Parear TV ✓</button>
                </div>
              </div>
            )}
            {pairStep==="done" && <div style={{ textAlign:"center",padding:"20px 0" }}><div style={{ fontSize:52,marginBottom:12 }}>✅</div><div style={{ fontSize:18,fontWeight:800,marginBottom:6 }}>TV pareada!</div></div>}
          </div>
        </div>
      )}

      {/* TV Preview */}
      {showTVPreview && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center" }} onClick={()=>setShowTVPreview(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ animation:"fadeUp .25s ease" }}>
            <div style={{ background:"#111",border:"6px solid #222",borderRadius:16,boxShadow:"0 0 0 2px #333,0 40px 80px rgba(0,0,0,.8)",overflow:"hidden",width:620,aspectRatio:"16/9",position:"relative" }}>
              <div style={{ width:"100%",height:"100%",background:"#050709",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden" }}>
                <div style={{ position:"absolute",width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle, ${accentColor}12 0%, transparent 70%)`,top:"50%",left:"50%",transform:"translate(-50%,-50%)" }} />
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:32 }}>
                  <div style={{ width:36,height:36,background:accentColor,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#000",fontSize:18,fontWeight:800 }}>{logoChar}</div>
                  <span style={{ fontSize:20,fontWeight:800,color:"#fff" }}>{brandName.split("").map((ch,i)=>i<brandName.length-3?<span key={i}>{ch}</span>:<span key={i} style={{ color:accentColor }}>{ch}</span>)}</span>
                </div>
                <div style={{ background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:16,padding:"28px 40px",textAlign:"center",marginBottom:24 }}>
                  <div style={{ fontSize:12,fontFamily:"var(--font-mono)",color:"rgba(255,255,255,.4)",marginBottom:16,letterSpacing:2 }}>CÓDIGO DE PAREAMENTO</div>
                  <div style={{ fontSize:52,fontWeight:800,letterSpacing:12,color:accentColor,fontFamily:"var(--font-mono)",animation:"pulse 2s ease-in-out infinite" }}>{tvCode}</div>
                  <div style={{ fontSize:12,fontFamily:"var(--font-mono)",color:"rgba(255,255,255,.35)",marginTop:16,lineHeight:1.6 }}>Acesse o painel e clique em <strong style={{ color:"rgba(255,255,255,.6)" }}>Adicionar TV</strong></div>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:10,color:"rgba(255,255,255,.3)",fontSize:12,fontFamily:"var(--font-mono)" }}>
                  <div style={{ width:14,height:14,border:`2px solid ${accentColor}40`,borderTopColor:accentColor,borderRadius:"50%",animation:"spin 1s linear infinite" }} />
                  Aguardando pareamento…
                </div>
                <button onClick={()=>setTvCode(makeCode())} style={{ position:"absolute",bottom:14,right:14,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.4)",borderRadius:6,padding:"5px 10px",fontSize:10,fontFamily:"var(--font-mono)",cursor:"pointer" }}>↺ novo código</button>
              </div>
            </div>
            <div style={{ display:"flex",justifyContent:"center" }}><div style={{ width:80,height:8,background:"#222",borderRadius:"0 0 4px 4px" }} /></div>
            <div style={{ display:"flex",justifyContent:"center" }}><div style={{ width:120,height:6,background:"#1a1a1a",borderRadius:4 }} /></div>
            <div style={{ textAlign:"center",marginTop:12,fontSize:12,color:"rgba(255,255,255,.3)",fontFamily:"var(--font-mono)" }}>Clique fora para fechar</div>
          </div>
        </div>
      )}

      {/* Generic modals */}
      {showNewClient && (
        <Modal title="Novo cliente" onClose={()=>setShowNewClient(false)}>
          <Label>NOME</Label><input value={newClientData.name} onChange={e=>setNewClientData(p=>({...p,name:e.target.value}))} placeholder="Nome do cliente" style={IN} />
          <Label>CNPJ</Label><input value={newClientData.cnpj} onChange={e=>setNewClientData(p=>({...p,cnpj:e.target.value}))} placeholder="00.000.000/0001-00" style={IN} />
          <button onClick={handleCreateClient} style={{ ...BP,width:"100%",marginTop:4 }}>Cadastrar cliente</button>
        </Modal>
      )}
      {showNewBranch && (
        <Modal title="Nova filial" onClose={()=>setShowNewBranch(null)}>
          <Label>NOME</Label><input value={newBranchData.name} onChange={e=>setNewBranchData(p=>({...p,name:e.target.value}))} placeholder="Nome da filial" style={IN} />
          <Label>CIDADE</Label><input value={newBranchData.city} onChange={e=>setNewBranchData(p=>({...p,city:e.target.value}))} placeholder="Cidade – Estado" style={IN} />
          <button onClick={handleCreateBranch} style={{ ...BP,width:"100%",marginTop:4 }}>Cadastrar filial</button>
        </Modal>
      )}

      {previewPreset && (
        <div style={{ position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"var(--surface)",border:"1px solid var(--accent)",borderRadius:99,padding:"10px 24px",fontSize:13,fontFamily:"var(--font-mono)",color:"var(--accent)",zIndex:500,pointerEvents:"none" }}>
          Pré-visualizando <strong>{PRESETS[previewPreset].name}</strong> — clique para aplicar
        </div>
      )}
    </div>
  );
}

// ── ClientBranches lazy loader ────────────────────────────────────────────────
function ClientBranches({ clientId, playlists, expandedBranches, toggleBranch, selectedScreen, setSelectedScreen, notify, loadAll }) {
  const [branches, setBranches] = useState([]);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    api.getClient(clientId).then(c => { setBranches(c.branches||[]); setLoaded(true); }).catch(()=>setLoaded(true));
  }, [clientId]);

  if (!loaded) return <div style={{ padding:16,color:"var(--muted)",fontSize:12,fontFamily:"var(--font-mono)" }}>Carregando...</div>;

  return (
    <div style={{ padding:"12px 16px",display:"flex",flexDirection:"column",gap:10 }}>
      {branches.map(branch=>(
        <div key={branch.id} style={{ background:"var(--bg)",border:"1px solid var(--border)",borderRadius:10,overflow:"hidden" }}>
          <div onClick={()=>toggleBranch(branch.id)} style={{ display:"flex",alignItems:"center",gap:12,padding:"11px 16px",cursor:"pointer",borderBottom:expandedBranches[branch.id]?"1px solid var(--border)":"none" }}>
            <div style={{ width:8,height:8,borderRadius:"50%",flexShrink:0,background:(branch.screens||[]).every(s=>s.status==="online")?"var(--green)":(branch.screens||[]).some(s=>s.status==="online")?"var(--accent3)":"var(--red)" }} />
            <div style={{ flex:1 }}>
              <span style={{ fontWeight:700,fontSize:13 }}>{branch.name}</span>
              <span style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)",marginLeft:10 }}>{branch.city}</span>
            </div>
            <div style={{ display:"flex",gap:8,alignItems:"center" }}>
              <span style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)" }}>{(branch.screens||[]).length} tela(s)</span>
              <button onClick={e=>{e.stopPropagation();notify(`Atualizando ${branch.name}…`);}} style={BX}>Atualizar</button>
              <span style={{ color:"var(--muted)",fontSize:13,display:"inline-block",transform:expandedBranches[branch.id]?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s" }}>▾</span>
            </div>
          </div>
          {expandedBranches[branch.id] && (
            <div style={{ padding:"10px 16px",display:"flex",flexDirection:"column",gap:8 }}>
              {(branch.screens||[]).map(screen=>(
                <div key={screen.id} onClick={()=>setSelectedScreen(selectedScreen?.id===screen.id?null:screen)} style={{ display:"grid",gridTemplateColumns:"28px 1fr auto auto auto",alignItems:"center",gap:12,padding:"10px 14px",background:selectedScreen?.id===screen.id?"rgba(0,229,255,.05)":"var(--surface2)",border:`1px solid ${selectedScreen?.id===screen.id?"var(--accent)":"var(--border)"}`,borderRadius:8,cursor:"pointer" }}>
                  <div style={{ width:28,height:20,borderRadius:4,background:"var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:screen.status==="online"?"var(--accent)":"var(--muted)" }}>⬛</div>
                  <div>
                    <div style={{ fontSize:13,fontWeight:700 }}>{screen.name}</div>
                    <div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)" }}>{screen.pair_code?<span>Código: <span style={{ color:"var(--accent)",letterSpacing:2 }}>{screen.pair_code}</span></span>:screen.location}</div>
                  </div>
                  <span style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)" }}>{screen.playlist_name||"—"}</span>
                  <span style={{ fontSize:10,fontFamily:"var(--font-mono)",fontWeight:500,color:screen.status==="online"?"var(--green)":"var(--red)",background:screen.status==="online"?"rgba(16,185,129,.12)":"rgba(239,68,68,.12)",padding:"3px 8px",borderRadius:99 }}>● {screen.status}</span>
                  <button onClick={async e=>{e.stopPropagation();try{await api.restartScreen(screen.id);notify(`Reiniciando ${screen.name}…`);}catch{notify("Erro.","error");}}} style={BX}>↺</button>
                </div>
              ))}
              {selectedScreen && branch.screens?.find(s=>s.id===selectedScreen.id) && (
                <div style={{ background:"rgba(0,229,255,.03)",border:"1px solid rgba(0,229,255,.15)",borderRadius:10,padding:16,marginTop:4,animation:"fadeUp .2s ease" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
                    <span style={{ fontSize:13,fontWeight:700,color:"var(--accent)" }}>Detalhes — {selectedScreen.name}</span>
                    <button onClick={()=>setSelectedScreen(null)} style={{ background:"transparent",border:"none",color:"var(--muted)",cursor:"pointer" }}>✕</button>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12 }}>
                    {(()=>{
                      const plName = selectedScreen.playlist_name || playlists.find(p=>p.id===selectedScreen.current_playlist_id)?.name || "—";
                      return [["Código",selectedScreen.pair_code||"—"],["Localização",selectedScreen.location||"—"],["Status",selectedScreen.status],["Playlist",plName]];
                    })().map(([k,v])=>(
                      <div key={k} style={{ background:"var(--bg)",borderRadius:8,padding:10 }}>
                        <div style={{ fontSize:10,fontFamily:"var(--font-mono)",color:"var(--muted)",marginBottom:3 }}>{k}</div>
                        <div style={{ fontSize:12,fontWeight:600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
                    <select
                      value={selectedScreen.current_playlist_id || ""}
                      onChange={async e=>{
                        if(!e.target.value) return;
                        try {
                          await api.assignPlaylist(selectedScreen.id, e.target.value);
                          // Atualiza selectedScreen localmente
                          const pl = playlists.find(p=>p.id===e.target.value);
                          setSelectedScreen(s=>({...s, current_playlist_id:e.target.value, playlist_name:pl?.name||""}));
                          await loadAll();
                          notify("Playlist atribuída!");
                        } catch { notify("Erro.","error"); }
                      }}
                      style={{ ...IN,flex:2 }}>
                      <option value="">— Selecionar playlist —</option>
                      {playlists.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button onClick={async()=>{try{await api.restartScreen(selectedScreen.id);notify("Reiniciando…");}catch{notify("Erro.","error");}}} style={BS}>Reiniciar</button>
                    <button onClick={async()=>{
                      if(!window.confirm("Remover esta tela?")) return;
                      try{ await api.deleteScreen(selectedScreen.id); setSelectedScreen(null); await loadAll(); notify("Tela removida!"); }
                      catch{ notify("Erro ao remover.","error"); }
                    }} style={{ background:"transparent",color:"var(--red)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,padding:"9px 14px",fontSize:13,fontWeight:600,fontFamily:"var(--font-display)",cursor:"pointer" }}>🗑 Remover</button>
                  </div>
                </div>
              )}
              {(branch.screens||[]).length===0 && <div style={{ textAlign:"center",padding:"20px 0",color:"var(--muted)",fontSize:13,fontFamily:"var(--font-mono)" }}>Nenhuma tela cadastrada</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────
function Modal({ title, children, onClose }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:14,padding:28,width:460,maxWidth:"90vw",animation:"fadeUp .2s ease" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <h2 style={{ fontSize:17,fontWeight:700 }}>{title}</h2>
          <button onClick={onClose} style={{ background:"transparent",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:18 }}>✕</button>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>{children}</div>
      </div>
    </div>
  );
}
function Chip({ label, color, bg }) { return <span style={{ fontSize:10,fontFamily:"var(--font-mono)",fontWeight:500,color,background:bg||`${color}18`,padding:"3px 8px",borderRadius:99 }}>{label}</span>; }
function SectionTitle({ children }) { return <div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)",letterSpacing:1,marginBottom:14 }}>{children}</div>; }
function Label({ children }) { return <div style={{ fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted)",marginBottom:6 }}>{children}</div>; }

// ── Style constants ───────────────────────────────────────────────────────────
const BP = { background:"var(--accent)",color:"#000",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:700,fontFamily:"var(--font-display)",cursor:"pointer" };
const BS = { background:"var(--surface2)",color:"var(--text)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,fontFamily:"var(--font-display)",cursor:"pointer" };
const BX = { background:"transparent",color:"var(--muted)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:600,fontFamily:"var(--font-display)",cursor:"pointer" };
const IN = { width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",color:"var(--text)",fontFamily:"var(--font-display)",fontSize:14 };
