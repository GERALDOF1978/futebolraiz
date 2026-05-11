import { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

// ==========================================
// SUAS CHAVES FIXAS (COLE AQUI E ESQUEÇA)
// ==========================================
const MINHA_API_KEY = "AIzaSyD6cX5F356OhIxIscJZ9bhkevjX7VMmdrU";
const MEU_CANAL_ID = "UCGB8jiI52Z5NaQbCwnEkF3A"; // Ex: UC1234567890abcdef

export default function Admin() {
  const [url, setUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const [infoExtra, setInfoExtra] = useState('');
  const [mensagem, setMensagem] = useState('');
  
  // Mensagens do Robô
  const [syncMsg, setSyncMsg] = useState('');

  const pegarIdDoVideo = (link) => {
    if (!link) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = link.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // ==========================================
  // FUNÇÃO 1: ATUALIZAR VIEWS/LIKES
  // ==========================================
  const sincronizarYouTube = async () => {
    if (!MINHA_API_KEY || MINHA_API_KEY.includes("COLE")) { 
      setSyncMsg('⚠️ Você esqueceu de colocar a API_KEY no código!'); return; 
    }
    setSyncMsg('Buscando dados no Firebase...');

    try {
      const querySnapshot = await getDocs(collection(db, "videos"));
      const videosDB = [];
      querySnapshot.forEach((doc) => videosDB.push({ id: doc.id, videoId: doc.data().videoId }));

      if (videosDB.length === 0) { setSyncMsg('Nenhum vídeo no banco de dados.'); return; }
      setSyncMsg(`Atualizando ${videosDB.length} vídeos... (Aguarde)`);

      let atualizados = 0;
      for (let i = 0; i < videosDB.length; i += 50) {
        const lote = videosDB.slice(i, i + 50);
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
      setSyncMsg(`✅ Sucesso! Views e Likes de ${atualizados} vídeos foram atualizados com 1 clique!`);
    } catch (error) {
      console.error(error);
      setSyncMsg('❌ Erro na sincronização com o YouTube.');
    }
  };

  // ==========================================
  // FUNÇÃO 2: BUSCAR VÍDEOS NOVOS DO CANAL
  // ==========================================
  const buscarVideosNovos = async () => {
    if (!MINHA_API_KEY || !MEU_CANAL_ID || MEU_CANAL_ID.includes("COLE")) { 
      setSyncMsg('⚠️ Faltou colocar a Chave ou o ID do Canal no código!'); return; 
    }
    setSyncMsg('Procurando vídeos novos no canal do YouTube...');

    try {
      // O YouTube guarda os uploads numa playlist especial (Troca UC por UU)
      const uploadsPlaylistId = MEU_CANAL_ID.replace(/^UC/, 'UU');

      const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&key=${MINHA_API_KEY}`);
      const data = await response.json();

      if (!data.items) { setSyncMsg('❌ Canal não encontrado ou sem vídeos.'); return; }

      let novosAdicionados = 0;

      for (const item of data.items) {
        const videoId = item.snippet.resourceId.videoId;
        const tituloVideo = item.snippet.title;
        const descricao = item.snippet.description;
        const dataPub = new Date(item.snippet.publishedAt);

        // Verifica se o vídeo já existe no Firebase
        const q = query(collection(db, "videos"), where("videoId", "==", videoId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          await addDoc(collection(db, "videos"), {
            videoId: videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            title: tituloVideo,
            thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            extraInfo: descricao.substring(0, 100) + '...',
            dataCadastro: dataPub,
            views: '0', likes: '0', local: 'YouTube'
          });
          novosAdicionados++;
        }
      }
      
      if (novosAdicionados > 0) {
        setSyncMsg(`🎉 Oba! ${novosAdicionados} vídeos novos baixados direto do canal! Clique em "Atualizar Views" para pegar os status deles.`);
      } else {
        setSyncMsg(`👍 Tudo certo! O app já tem todos os vídeos do seu canal.`);
      }

    } catch (error) {
      console.error(error);
      setSyncMsg('❌ Erro ao buscar novos vídeos.');
    }
  };

  // ==========================================
  // FUNÇÃO 3: SALVAR MANUAL (CASO PRECISE)
  // ==========================================
  const salvarVideo = async (e) => {
    e.preventDefault();
    setMensagem('Salvando...');
    const videoId = pegarIdDoVideo(url);
    if (!videoId) { setMensagem('URL do YouTube inválida!'); return; }
    try {
      await addDoc(collection(db, "videos"), {
        videoId: videoId, url: url, title: titulo,
        thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        extraInfo: infoExtra, dataCadastro: new Date(), views: 0, likes: 0, local: 'Adicionado Manualmente'
      });
      setMensagem('Vídeo adicionado com sucesso!');
      setUrl(''); setTitulo(''); setInfoExtra('');
    } catch (error) { setMensagem('Erro ao salvar vídeo.'); }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
      <h2 style={{ color: '#e62117' }}>Painel Admin - Futebol Raiz FG</h2>
      
      {/* ========================================== */}
      {/* AUTOMAÇÃO YOUTUBE (AGORA COM 1 CLIQUE) */}
      {/* ========================================== */}
      <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
        <h3 style={{ color: '#3ea6ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🤖 Automação do Canal
        </h3>
        <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '15px' }}>
          Seu aplicativo já está conectado diretamente ao canal oficial. Clique nos botões abaixo para gerenciar o seu conteúdo com um clique.
        </p>

        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button onClick={buscarVideosNovos} style={{ ...btnStyle, backgroundColor: '#00cc66', flex: 1, minWidth: '200px' }}>
            📥 Importar Novos Vídeos do Canal
          </button>
          <button onClick={sincronizarYouTube} style={{ ...btnStyle, backgroundColor: '#3ea6ff', flex: 1, minWidth: '200px' }}>
            🔄 Sincronizar Views e Likes (Todos)
          </button>
        </div>
        
        {syncMsg && <p style={{ marginTop: '15px', color: '#fff', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '5px' }}>{syncMsg}</p>}
      </div>

      <hr style={{ borderColor: '#333', margin: '30px 0' }}/>
      
      {/* CADASTRO MANUAL (Mantido de backup) */}
      <div style={{ background: '#111', padding: '20px', borderRadius: '10px' }}>
        <h3>➕ Cadastrar Vídeo Manualmente (Avulso)</h3>
        <form onSubmit={salvarVideo} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL do YouTube" required style={inputStyle} />
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do Vídeo" required style={inputStyle} />
          <textarea value={infoExtra} onChange={(e) => setInfoExtra(e.target.value)} placeholder="Detalhes (Campeonato, Placar...)" rows="3" required style={inputStyle} />
          <button type="submit" style={btnStyle}>Salvar Vídeo</button>
        </form>
        {mensagem && <p style={{ marginTop: '15px', color: '#00ff88' }}>{mensagem}</p>}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px', marginTop: '5px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#000', color: '#fff', outline: 'none' };
const btnStyle = { padding: '14px', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' };