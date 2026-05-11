import { useState } from 'react';
import { db } from './firebase';
// Adicionamos getDocs, doc e updateDoc
import { collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import Papa from 'papaparse'; 

export default function Admin() {
  const [url, setUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const [infoExtra, setInfoExtra] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [msgLote, setMsgLote] = useState('');
  
  // NOVOS ESTADOS PARA A SINCRONIZAÇÃO DO YOUTUBE
  const [apiKey, setApiKey] = useState('');
  const [syncMsg, setSyncMsg] = useState('');

  // ... (mantenha as funções converterDataCSV, pegarIdDoVideo, importarCSV e salvarVideo como já estavam) ...

  const converterDataCSV = (dataStr) => {
    if (!dataStr) return new Date();
    return new Date(dataStr.replace(" ", "T")); 
  };

  const pegarIdDoVideo = (link) => {
    if (!link) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = link.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Funções importarCSV e salvarVideo que você já tem...
  // (Para não ficar gigante, estou pulando elas aqui, você pode manter as suas)

  // ==========================================
  // NOVA FUNÇÃO: SINCRONIZAR COM YOUTUBE
  // ==========================================
  const sincronizarYouTube = async () => {
    if (!apiKey) {
      setSyncMsg('⚠️ Por favor, cole a sua Chave de API do YouTube primeiro.');
      return;
    }
    setSyncMsg('Sincronizando... Buscando dados no Firebase...');

    try {
      // 1. Pega todos os vídeos do seu Firebase
      const querySnapshot = await getDocs(collection(db, "videos"));
      const videosDB = [];
      querySnapshot.forEach((doc) => {
        videosDB.push({ id: doc.id, videoId: doc.data().videoId });
      });

      if (videosDB.length === 0) {
        setSyncMsg('Nenhum vídeo encontrado no banco de dados.');
        return;
      }

      setSyncMsg(`Sincronizando ${videosDB.length} vídeos com o YouTube...`);

      // 2. A API do YouTube só permite checar 50 vídeos por vez. Vamos dividir em lotes.
      let atualizados = 0;
      for (let i = 0; i < videosDB.length; i += 50) {
        const lote = videosDB.slice(i, i + 50);
        // Junta os IDs separando por vírgula (ex: id1,id2,id3...)
        const idsString = lote.map(v => v.videoId).join(',');

        // 3. Chama a API do YouTube
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${idsString}&key=${apiKey}`);
        const data = await response.json();

        if (data.items) {
           for (const item of data.items) {
              // Encontra qual é este vídeo no nosso banco de dados
              const videoParaAtualizar = lote.find(v => v.videoId === item.id);
              if (videoParaAtualizar) {
                 // 4. Atualiza os dados no Firebase!
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
      setSyncMsg(`✅ Sucesso! Views e Likes de ${atualizados} vídeos foram atualizados!`);
    } catch (error) {
      console.error(error);
      setSyncMsg('❌ Erro na sincronização. Verifique se a sua Chave da API está correta e ativada.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
      <h2 style={{ color: '#e62117' }}>Painel Admin - Futebol Raiz FG</h2>
      
      {/* ========================================== */}
      {/* NOVA SESSÃO: SINCRONIZAR VIEWS E LIKES */}
      {/* ========================================== */}
      <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
        <h3>🔄 Atualizar Views e Likes (YouTube API)</h3>
        <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '15px' }}>
          Cole sua chave de API do YouTube para buscar as visualizações e curtidas atualizadas de <b>todos os vídeos</b> que já estão no App.
        </p>
        <input 
          type="text" 
          value={apiKey} 
          onChange={(e) => setApiKey(e.target.value)} 
          placeholder="AIzaSyD6cX5F356OhIxIscJZ9bhkevjX7VMmdrU" 
          style={inputStyle} 
        />
        <button onClick={sincronizarYouTube} style={{ ...btnStyle, backgroundColor: '#3ea6ff', marginTop: '10px', width: '100%' }}>
          Buscar Novos Dados no YouTube
        </button>
        {syncMsg && <p style={{ marginTop: '10px', color: '#fff', fontWeight: 'bold' }}>{syncMsg}</p>}
      </div>

      <hr style={{ borderColor: '#333', margin: '30px 0' }}/>
      
      {/* Mantenha aqui as suas divs de "Importar Arquivo CSV" e "Cadastrar Vídeo Manualmente" que já existiam! */}

    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px', marginTop: '5px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#000', color: '#fff', outline: 'none' };
const btnStyle = { padding: '14px', backgroundColor: '#e62117', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' };