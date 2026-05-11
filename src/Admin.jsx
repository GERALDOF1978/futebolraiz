import { useState, useEffect } from 'react';
import { db } from './firebase';
// Adicionamos o 'orderBy' aqui nos imports!
import { collection, addDoc, getDocs, doc, updateDoc, query, where, deleteDoc, onSnapshot, setDoc, orderBy } from 'firebase/firestore';

// ==========================================
// SUAS CHAVES FIXAS 
// ==========================================
const MINHA_API_KEY = "AIzaSyD6cX5F356OhIxIscJZ9bhkevjX7VMmdrU";
const MEU_CANAL_ID = "UCGB8jiI52Z5NaQbCwnEkF3A"; 

export default function Admin() {
  const [url, setUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const [infoExtra, setInfoExtra] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [syncMsg, setSyncMsg] = useState('');
  
  const [videosLista, setVideosLista] = useState([]);
  const [mostrarStats, setMostrarStats] = useState(true);

  useEffect(() => {
    // 1. CORREÇÃO DA ORDEM: Agora puxa organizado pela dataCadastro igual na Home!
    const qVideos = query(collection(db, "videos"), orderBy("dataCadastro", "desc"));
    const unsubVideos = onSnapshot(qVideos, (snapshot) => {
      setVideosLista(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubConfig = onSnapshot(doc(db, "config", "geral"), (docSnap) => {
      if (docSnap.exists()) {
        setMostrarStats(docSnap.data().mostrarStats ?? true);
      }
    });

    return () => { unsubVideos(); unsubConfig(); };
  }, []);

  const pegarIdDoVideo = (link) => {
    if (!link) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = link.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // ==========================================
  // CORREÇÃO DO BOTÃO OCULTAR / RESTAURAR
  // ==========================================
  const alternarVisibilidade = async (id, tituloVideo, estaOculto) => {
    // Se estaOculto for undefined (vídeo antigo), considera como false.
    const statusAtual = estaOculto === true; 
    const acao = statusAtual ? "RESTAURAR" : "OCULTAR";
    
    if (window.confirm(`Tem certeza que deseja ${acao} o vídeo: "${tituloVideo}"?`)) {
      try {
        await updateDoc(doc(db, "videos", id), { oculto: !statusAtual });
      } catch (error) {
        alert(`Erro ao ${acao.toLowerCase()} vídeo.`);
      }
    }
  };

  const salvarConfigStats = async (valor) => {
    setMostrarStats(valor);
    await setDoc(doc(db, "config", "geral"), { mostrarStats: valor }, { merge: true });
  };

  const sincronizarYouTube = async () => {
    if (!MINHA_API_KEY || MINHA_API_KEY.includes("COLE")) { 
      setSyncMsg('⚠️ API Key não configurada!'); return; 
    }
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
                 await updateDoc(videoRef, {
                    views: item.statistics.viewCount || '0',
                    likes: item.statistics.likeCount || '0'
                 });
                 atualizados++;
              }
           }
        }
      }
      setSyncMsg(`✅ Sucesso! Views e Likes de ${atualizados} vídeos atualizados!`);
    } catch (error) {
      setSyncMsg('❌ Erro na sincronização com o YouTube.');
    }
  };

  const buscarVideosNovos = async () => {
    if (!MINHA_API_KEY || !MEU_CANAL_ID || MEU_CANAL_ID.includes("COLE")) { 
      setSyncMsg('⚠️ API Key ou Canal ID não configurados!'); return; 
    }
    setSyncMsg('Procurando vídeos novos no canal...');

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
      if (novosAdicionados > 0) setSyncMsg(`🎉 ${novosAdicionados} vídeos novos baixados!`);
      else setSyncMsg(`👍 Tudo certo! O app já tem todos os vídeos.`);
    } catch (error) {
      setSyncMsg('❌ Erro ao buscar novos vídeos.');
    }
  };

  const salvarVideo = async (e) => {
    e.preventDefault();
    setMensagem('Salvando...');
    const videoId = pegarIdDoVideo(url);
    if (!videoId) { setMensagem('URL inválida!'); return; }
    try {
      await addDoc(collection(db, "videos"), {
        videoId: videoId, url: url, title: titulo, thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        extraInfo: infoExtra, dataCadastro: new Date(), views: 0, likes: 0, local: 'Manual', oculto: false
      });
      setMensagem('Vídeo adicionado com sucesso!'); setUrl(''); setTitulo(''); setInfoExtra('');
    } catch (error) { setMensagem('Erro ao salvar vídeo.'); }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
      <h2 style={{ color: '#e62117' }}>Painel Admin - Futebol Raiz FG</h2>
      
      {/* ⚙️ CONFIGURAÇÕES GERAIS */}
      <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
        <h3 style={{ color: '#ffcc00' }}>⚙️ Configurações do App</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '10px' }}>
          <input 
            type="checkbox" 
            checked={mostrarStats} 
            onChange={(e) => salvarConfigStats(e.target.checked)} 
            style={{ width: '20px', height: '20px', accentColor: '#e62117' }}
          />
          <span style={{ fontSize: '15px' }}>Exibir Visualizações e Curtidas no Aplicativo</span>
        </label>
      </div>

      {/* 🤖 AUTOMAÇÃO YOUTUBE */}
      <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
        <h3 style={{ color: '#3ea6ff' }}>🤖 Automação do Canal</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '15px' }}>
          <button onClick={buscarVideosNovos} style={{ ...btnStyle, backgroundColor: '#00cc66', flex: 1 }}>📥 Importar Novos</button>
          <button onClick={sincronizarYouTube} style={{ ...btnStyle, backgroundColor: '#3ea6ff', flex: 1 }}>🔄 Sincronizar Views</button>
        </div>
        {syncMsg && <p style={{ marginTop: '15px', color: '#fff', fontWeight: 'bold' }}>{syncMsg}</p>}
      </div>

      {/* 👁️ GERENCIAR VÍDEOS (OCULTAR / RESTAURAR) */}
      <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
        <h3 style={{ color: '#ffcc00' }}>👁️ Gerenciar Vídeos</h3>
        <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '15px' }}>Total de vídeos no banco: {videosLista.length}</p>
        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px', border: '1px solid #333', borderRadius: '8px' }}>
          {videosLista.map(video => (
            <div key={video.id} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', 
              borderBottom: '1px solid #222', 
              background: video.oculto ? '#331111' : '#111', 
              opacity: video.oculto ? 0.6 : 1
            }}>
              <span style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '75%', textDecoration: video.oculto ? 'line-through' : 'none' }}>
                {video.oculto ? '🚫 [OCULTO] ' : ''}{video.title}
              </span>
              <button 
                onClick={() => alternarVisibilidade(video.id, video.title, video.oculto)} 
                style={{ 
                  backgroundColor: video.oculto ? '#00cc66' : '#e62117', 
                  color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' 
                }}
              >
                {video.oculto ? 'Restaurar' : 'Ocultar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <hr style={{ borderColor: '#333', margin: '30px 0' }}/>
      
      {/* ➕ CADASTRO MANUAL */}
      <div style={{ background: '#111', padding: '20px', borderRadius: '10px' }}>
        <h3>➕ Cadastrar Manualmente</h3>
        <form onSubmit={salvarVideo} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL do YouTube" required style={inputStyle} />
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do Vídeo" required style={inputStyle} />
          <textarea value={infoExtra} onChange={(e) => setInfoExtra(e.target.value)} placeholder="Detalhes" rows="2" required style={inputStyle} />
          <button type="submit" style={btnStyle}>Salvar Vídeo</button>
        </form>
        {mensagem && <p style={{ marginTop: '15px', color: '#00ff88' }}>{mensagem}</p>}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px', marginTop: '5px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#000', color: '#fff', outline: 'none' };
const btnStyle = { padding: '14px', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' };