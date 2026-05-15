import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, onSnapshot, setDoc, orderBy } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

const MINHA_API_KEY = "AIzaSyD6cX5F356OhIxIscJZ9bhkevjX7VMmdrU";
const MEU_CANAL_ID = "UCGB8jiI52Z5NaQbCwnEkF3A"; 
const IMGBB_API_KEY = "4b9754c2755159cb53d4ac84ddb27f8d";

export default function Admin() {
  // Estado de Navegação do Menu
  const [abaAtiva, setAbaAtiva] = useState('videos');

  // 1. TODOS OS ESTADOS NO TOPO
  const [usuario, setUsuario] = useState(null);
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [erroLogin, setErroLogin] = useState('');

  const [url, setUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const [infoExtra, setInfoExtra] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [syncMsg, setSyncMsg] = useState('');
  const [videosLista, setVideosLista] = useState([]);
  const [mostrarStats, setMostrarStats] = useState(true);

  const [splashImagem, setSplashImagem] = useState(null);
  const [splashDataHora, setSplashDataHora] = useState('');
  const [splashMsg, setSplashMsg] = useState('');

  const [tituloAlerta, setTituloAlerta] = useState('');
  const [textoAlerta, setTextoAlerta] = useState('');
  const [statusEnvio, setStatusEnvio] = useState('');

  const [novoAdminEmail, setNovoAdminEmail] = useState('');
  const [novoAdminSenha, setNovoAdminSenha] = useState('');
  const [statusNovoAdmin, setStatusNovoAdmin] = useState('');

  const auth = getAuth();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => setUsuario(user));

    const qVideos = query(collection(db, "videos"), orderBy("dataCadastro", "desc"));
    const unsubVideos = onSnapshot(qVideos, (snapshot) => {
      setVideosLista(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubConfig = onSnapshot(doc(db, "config", "geral"), (docSnap) => {
      if (docSnap.exists()) setMostrarStats(docSnap.data().mostrarStats ?? true);
    });

    return () => { unsubAuth(); unsubVideos(); unsubConfig(); };
  }, [auth]);

  // ==========================================
  // FUNÇÕES DE AÇÃO
  // ==========================================
  const fazerLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, emailLogin, senhaLogin);
      setErroLogin('');
    } catch (error) { setErroLogin('E-mail ou senha incorretos.'); }
  };

  const sair = () => signOut(auth);

  const dispararAlerta = async (e) => {
    e.preventDefault();
    setStatusEnvio('A processar envio para apoiar os nossos atletas...');
    try {
      const response = await fetch('/api/enviar-alerta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: tituloAlerta, mensagem: textoAlerta }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatusEnvio(data.message || `✅ Alerta enviado com sucesso!`);
        setTituloAlerta(''); setTextoAlerta('');
      } else {
        setStatusEnvio(`❌ Erro do Servidor: ${data.error}`);
      }
    } catch (error) { setStatusEnvio('❌ Falha na ligação com a Vercel.'); }
  };

  const salvarSplash = async (e) => {
    e.preventDefault();
    if (!splashImagem || !splashDataHora) { setSplashMsg('⚠️ Escolha uma imagem e defina a data/hora.'); return; }
    setSplashMsg('⏳ A enviar para o servidor...');
    try {
      const formData = new FormData();
      formData.append('image', splashImagem);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      const dataImg = await res.json();
      if (!dataImg.data || !dataImg.data.url) throw new Error('Falha ao enviar imagem');
      await setDoc(doc(db, "config", "splash"), { urlImagem: dataImg.data.url, expiraEm: new Date(splashDataHora).toISOString(), ativo: true });
      setSplashMsg('✅ Splash Screen configurado!'); setSplashImagem(null);
    } catch (error) { setSplashMsg('❌ Erro ao configurar Splash.'); }
  };

  const desativarSplash = async () => {
    await setDoc(doc(db, "config", "splash"), { ativo: false }, { merge: true });
    setSplashMsg('✅ Splash desativado.');
  };

  const pegarIdDoVideo = (link) => {
    if (!link) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = link.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const alternarVisibilidade = async (id, tituloVideo, estaOculto) => {
    const statusAtual = estaOculto === true; 
    const acao = statusAtual ? "RESTAURAR" : "OCULTAR";
    if (window.confirm(`Tem certeza que deseja ${acao} o vídeo: "${tituloVideo}"?`)) {
      try { await updateDoc(doc(db, "videos", id), { oculto: !statusAtual }); } catch (error) { alert(`Erro ao ${acao.toLowerCase()} vídeo.`); }
    }
  };

  const salvarConfigStats = async (valor) => {
    setMostrarStats(valor);
    await setDoc(doc(db, "config", "geral"), { mostrarStats: valor }, { merge: true });
  };

  const buscarVideosNovos = async () => {
    if (!MINHA_API_KEY || !MEU_CANAL_ID || MEU_CANAL_ID.includes("COLE")) { setSyncMsg('⚠️ API Key ou Canal ID não configurados!'); return; }
    setSyncMsg('A procurar vídeos novos no canal...');
    try {
      const uploadsPlaylistId = MEU_CANAL_ID.replace(/^UC/, 'UU');
      const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&key=${MINHA_API_KEY}`);
      const data = await response.json();
      if (!data.items) { setSyncMsg('❌ Canal não encontrado ou sem vídeos.'); return; }
      let novosAdicionados = 0;
      for (const item of data.items) {
        const videoId = item.snippet.resourceId.videoId;
        const q = query(collection(db, "videos"), where("videoId", "==", videoId));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          await addDoc(collection(db, "videos"), {
            videoId: videoId, url: `https://www.youtube.com/watch?v=${videoId}`,
            title: item.snippet.title, thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            extraInfo: item.snippet.description.substring(0, 100) + '...',
            dataCadastro: new Date(item.snippet.publishedAt), views: '0', likes: '0', local: 'YouTube', oculto: false
          });
          novosAdicionados++;
        }
      }
      if (novosAdicionados > 0) setSyncMsg(`🎉 ${novosAdicionados} vídeos baixados!`);
      else setSyncMsg(`👍 Tudo atualizado.`);
    } catch (error) { setSyncMsg('❌ Erro na busca.'); }
  };

  const sincronizarYouTube = async () => {
    if (!MINHA_API_KEY || MINHA_API_KEY.includes("COLE")) { setSyncMsg('⚠️ API Key não configurada!'); return; }
    setSyncMsg('Atualizando vídeos... (Aguarde)');
    try {
      let atualizados = 0;
      for (let i = 0; i < videosLista.length; i += 50) {
        const lote = videosLista.slice(i, i + 50);
        const idsString = lote.map(v => v.videoId).join(',');
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${idsString}&key=${MINHA_API_KEY}`);
        const data = await response.json();
        if (data.items) {
           for (const item of data.items) {
              const videoParaAtualizar = lote.find(v => v.videoId === item.id);
              if (videoParaAtualizar) {
                 const videoRef = doc(db, "videos", videoParaAtualizar.id);
                 await updateDoc(videoRef, { views: item.statistics.viewCount || '0', likes: item.statistics.likeCount || '0' });
                 atualizados++;
              }
           }
        }
      }
      setSyncMsg(`✅ Sucesso! Views e Likes de ${atualizados} vídeos atualizados!`);
    } catch (error) { setSyncMsg('❌ Erro na sincronização com o YouTube.'); }
  };

  const salvarVideo = async (e) => {
    e.preventDefault();
    setMensagem('A salvar...');
    const videoId = pegarIdDoVideo(url);
    if (!videoId) { setMensagem('URL inválida!'); return; }
    try {
      await addDoc(collection(db, "videos"), {
        videoId: videoId, url: url, title: titulo, thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        extraInfo: infoExtra, dataCadastro: new Date(), views: 0, likes: 0, local: 'Manual', oculto: false
      });
      setMensagem('Vídeo adicionado com sucesso!'); setUrl(''); setTitulo(''); setInfoExtra('');
    } catch (error) { setMensagem('Erro ao salvar.'); }
  };

  const criarNovoAdmin = async (e) => {
    e.preventDefault();
    setStatusNovoAdmin('A registar novo administrador...');
    try {
      const response = await fetch('/api/criar-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: novoAdminEmail, senha: novoAdminSenha }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatusNovoAdmin('✅ ' + data.message);
        setNovoAdminEmail(''); setNovoAdminSenha('');
      } else {
        setStatusNovoAdmin(`❌ Erro: ${data.error}`);
      }
    } catch (error) { setStatusNovoAdmin('❌ Falha na ligação com o servidor.'); }
  };

  // ==========================================
  // TELA DE LOGIN
  // ==========================================
  if (!usuario) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f0f0f' }}>
        <form onSubmit={fazerLogin} style={{ background: '#1a1a1a', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '400px', border: '1px solid #333' }}>
          <h2 style={{ color: '#e62117', textAlign: 'center', marginBottom: '20px' }}>🔒 Acesso Restrito</h2>
          <input type="email" placeholder="E-mail Administrativo" value={emailLogin} onChange={e => setEmailLogin(e.target.value)} style={inputStyle} required />
          <input type="password" placeholder="Senha" value={senhaLogin} onChange={e => setSenhaLogin(e.target.value)} style={inputStyle} required />
          <button type="submit" style={{...btnStyle, width: '100%', marginTop: '15px', backgroundColor: '#e62117'}}>Entrar no Painel</button>
          {erroLogin && <p style={{ color: '#ff4d4d', marginTop: '10px', textAlign: 'center' }}>{erroLogin}</p>}
        </form>
      </div>
    );
  }

  // ==========================================
  // PAINEL DE ADMINISTRAÇÃO LOGADO
  // ==========================================
  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh', color: '#fff', paddingBottom: '40px' }}>
      
      {/* CABEÇALHO */}
      <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderBottom: '2px solid #e62117', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ color: '#e62117', margin: 0 }}>Gestão Futebol Raiz</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={sair} style={{ backgroundColor: '#444', color: '#fff', border: '1px solid #666', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Sair</button>
        </div>
      </div>

      {/* MENU DE NAVEGAÇÃO SUPERIOR */}
      <div style={{ display: 'flex', gap: '10px', padding: '15px 20px', overflowX: 'auto', borderBottom: '1px solid #333', backgroundColor: '#111' }}>
        <button onClick={() => setAbaAtiva('videos')} style={abaAtiva === 'videos' ? abaAtivaStyle : abaInativaStyle}>📹 Gerenciar Vídeos</button>
        <button onClick={() => setAbaAtiva('alertas')} style={abaAtiva === 'alertas' ? abaAtivaStyle : abaInativaStyle}>📢 Alertas Push</button>
        <button onClick={() => setAbaAtiva('splash')} style={abaAtiva === 'splash' ? abaAtivaStyle : abaInativaStyle}>🚀 Abertura (Splash)</button>
        <button onClick={() => setAbaAtiva('config')} style={abaAtiva === 'config' ? abaAtivaStyle : abaInativaStyle}>⚙️ Automação</button>
        <button onClick={() => setAbaAtiva('perfil')} style={abaAtiva === 'perfil' ? abaAtivaStyle : abaInativaStyle}>👤 Meu Perfil</button>
      </div>

      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>

        {/* ----------------- ABA: VÍDEOS ----------------- */}
        {abaAtiva === 'videos' && (
          <div className="fade-in">
            <div style={boxStyle}>
              <h3 style={{ color: '#ffcc00' }}>👁️ Gerenciar Vídeos</h3>
              <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '15px' }}>Total de vídeos no banco: {videosLista.length}</p>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px', border: '1px solid #333', borderRadius: '8px', background: '#111' }}>
                {videosLista.map(video => (
                  <div key={video.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', 
                    borderBottom: '1px solid #222', background: video.oculto ? '#331111' : 'transparent', opacity: video.oculto ? 0.6 : 1, gap: '15px'
                  }}>
                    {/* MINIATURA DA CAPA */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', overflow: 'hidden', flex: 1 }}>
                      <img src={video.thumb} alt="Capa" style={{ width: '90px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #444', flexShrink: 0 }} />
                      <span style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: video.oculto ? 'line-through' : 'none' }}>
                        {video.oculto ? '🚫 [OCULTO] ' : ''}{video.title}
                      </span>
                    </div>

                    <button 
                      onClick={() => alternarVisibilidade(video.id, video.title, video.oculto)} 
                      style={{ backgroundColor: video.oculto ? '#00cc66' : '#e62117', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', minWidth: '100px' }}
                    >
                      {video.oculto ? 'Restaurar' : 'Ocultar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <hr style={{ borderColor: '#333', margin: '30px 0' }}/>
            
            <div style={{ ...boxStyle, background: '#111' }}>
              <h3>➕ Cadastrar Manualmente</h3>
              <form onSubmit={salvarVideo} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL do YouTube" required style={inputStyle} />
                <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do Vídeo" required style={inputStyle} />
                <textarea value={infoExtra} onChange={(e) => setInfoExtra(e.target.value)} placeholder="Detalhes" rows="2" required style={inputStyle} />
                <button type="submit" style={{...btnStyle, backgroundColor: '#333'}}>Salvar Vídeo</button>
              </form>
              {mensagem && <p style={{ marginTop: '15px', color: '#00ff88' }}>{mensagem}</p>}
            </div>
          </div>
        )}

        {/* ----------------- ABA: ALERTAS ----------------- */}
        {abaAtiva === 'alertas' && (
          <div className="fade-in" style={boxStyle}>
            <h3 style={{ color: '#ff4d4d' }}>📢 Enviar Alerta Push (Comunidade)</h3>
            <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '15px' }}>Avise a todos que o jogo vai começar.</p>
            <form onSubmit={dispararAlerta} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Título (Ex: Jogo ao Vivo!)" value={tituloAlerta} onChange={(e) => setTituloAlerta(e.target.value)} style={inputStyle} required />
              <textarea placeholder="Mensagem (Ex: Venha apoiar o Sub-12 do Independente!)" value={textoAlerta} onChange={(e) => setTextoAlerta(e.target.value)} rows="2" style={inputStyle} required />
              <button type="submit" style={{ ...btnStyle, backgroundColor: '#e62117' }}>Disparar Alerta Agora</button>
            </form>
            {statusEnvio && <p style={{ marginTop: '10px', fontWeight: 'bold', color: '#00ff88' }}>{statusEnvio}</p>}
          </div>
        )}

        {/* ----------------- ABA: SPLASH ----------------- */}
        {abaAtiva === 'splash' && (
          <div className="fade-in" style={boxStyle}>
            <h3 style={{ color: '#00ff88' }}>🚀 Anúncio de Abertura (Splash Screen)</h3>
            <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '15px' }}>Faça upload de uma imagem patrocinada e defina até quando ela deve aparecer.</p>
            <form onSubmit={salvarSplash} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="file" accept="image/*" onChange={(e) => setSplashImagem(e.target.files[0])} style={inputStyle} required />
              <label style={{ fontSize: '14px', color: '#ccc' }}>Aparecer na abertura ATÉ o dia/hora:</label>
              <input type="datetime-local" value={splashDataHora} onChange={(e) => setSplashDataHora(e.target.value)} style={inputStyle} required />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button type="submit" style={{ ...btnStyle, backgroundColor: '#00cc66', flex: 1, minWidth: '200px' }}>Programar Splash</button>
                <button type="button" onClick={desativarSplash} style={{ ...btnStyle, backgroundColor: '#444', flex: 1, minWidth: '200px' }}>Desativar Agora</button>
              </div>
            </form>
            {splashMsg && <p style={{ marginTop: '15px', color: '#fff', fontWeight: 'bold', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '5px' }}>{splashMsg}</p>}
          </div>
        )}

        {/* ----------------- ABA: CONFIGURAÇÕES ----------------- */}
        {abaAtiva === 'config' && (
          <div className="fade-in" style={boxStyle}>
            <h3 style={{ color: '#ffcc00' }}>⚙️ Automação e Estatísticas</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '10px', marginBottom: '15px' }}>
              <input type="checkbox" checked={mostrarStats} onChange={(e) => salvarConfigStats(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: '#e62117' }} />
              <span style={{ fontSize: '15px' }}>Exibir Visualizações e Curtidas no App</span>
            </label>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <button onClick={buscarVideosNovos} style={{ ...btnStyle, backgroundColor: '#00cc66', flex: 1 }}>📥 Importar Novos (YouTube)</button>
              <button onClick={sincronizarYouTube} style={{ ...btnStyle, backgroundColor: '#3ea6ff', flex: 1 }}>🔄 Sincronizar Views</button>
            </div>
            {syncMsg && <p style={{ marginTop: '15px', color: '#fff', fontWeight: 'bold' }}>{syncMsg}</p>}
          </div>
        )}

        {/* ----------------- ABA: PERFIL ----------------- */}
        {abaAtiva === 'perfil' && (
          <div className="fade-in">
            {/* Cartão de Perfil */}
            <div style={{ ...boxStyle, textAlign: 'center', padding: '40px 20px', backgroundImage: 'linear-gradient(to right, #1a1a1a, #2a0808)' }}>
              <div style={{ width: '80px', height: '80px', backgroundColor: '#e62117', borderRadius: '50%', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '35px' }}>👤</div>
              <h2 style={{ margin: 0 }}>Painel de Gestão</h2>
              <p style={{ color: '#aaa', fontSize: '16px', margin: '10px 0 25px' }}>Logado como: <strong>{usuario.email}</strong></p>
              
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/" style={{ ...btnStyle, backgroundColor: '#00cc66', textDecoration: 'none', display: 'inline-block' }}>📱 Ir para a Página de Clientes</a>
                <button onClick={sair} style={{ ...btnStyle, backgroundColor: '#444' }}>Sair do Sistema</button>
              </div>
            </div>

            {/* Criar Novo Administrador */}
            <div style={{ ...boxStyle, marginTop: '20px' }}>
              <h3 style={{ color: '#3ea6ff' }}>👥 Adicionar Novo Administrador</h3>
              <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '15px' }}>Crie acessos independentes para a equipa apoiar o projeto.</p>
              
              <form onSubmit={criarNovoAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="email" placeholder="E-mail do novo administrador" value={novoAdminEmail} onChange={(e) => setNovoAdminEmail(e.target.value)} style={inputStyle} required />
                <input type="password" placeholder="Senha (mínimo de 6 caracteres)" value={novoAdminSenha} onChange={(e) => setNovoAdminSenha(e.target.value)} style={inputStyle} minLength="6" required />
                <button type="submit" style={{ ...btnStyle, backgroundColor: '#3ea6ff' }}>Registar Administrador</button>
              </form>
              {statusNovoAdmin && <p style={{ marginTop: '10px', fontWeight: 'bold', color: statusNovoAdmin.includes('✅') ? '#00ff88' : '#ff4d4d' }}>{statusNovoAdmin}</p>}
            </div>
          </div>
        )}

      </div>
    </div> 
  );
}

// Estilos Reutilizáveis do Painel
const boxStyle = { background: '#1a1a1a', border: '1px solid #333', padding: '25px', borderRadius: '10px' };
const inputStyle = { width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#000', color: '#fff', outline: 'none' };
const btnStyle = { padding: '14px', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: '0.2s' };
const abaInativaStyle = { padding: '12px 20px', background: '#222', color: '#aaa', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', transition: '0.3s' };
const abaAtivaStyle = { padding: '12px 20px', background: '#e62117', color: '#fff', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(230,33,23,0.4)', transition: '0.3s' };