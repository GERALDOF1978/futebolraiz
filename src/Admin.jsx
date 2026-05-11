// src/Admin.jsx
import { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function Admin() {
  const [url, setUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const [infoExtra, setInfoExtra] = useState('');
  const [mensagem, setMensagem] = useState('');

  // Função simples para extrair o ID do vídeo da URL do YouTube
  const extrairVideoId = (link) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = link.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const salvarVideo = async (e) => {
    e.preventDefault();
    setMensagem('Salvando...');

    const videoId = extrairVideoId(url);
    if (!videoId) {
      setMensagem('URL do YouTube inválida!');
      return;
    }

    try {
      // Salva no Firestore na coleção "videos"
      await addDoc(collection(db, "videos"), {
        videoId: videoId,
        url: url,
        title: titulo,
        thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        extraInfo: infoExtra,
        dataCadastro: new Date()
      });

      setMensagem('Vídeo adicionado com sucesso!');
      setUrl('');
      setTitulo('');
      setInfoExtra('');
    } catch (error) {
      console.error("Erro ao salvar: ", error);
      setMensagem('Erro ao salvar vídeo.');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', color: '#fff' }}>
      <h2>Painel Admin - Futebol Raiz FG</h2>
      <p>Cadastre novos vídeos e informações adicionais.</p>

      <form onSubmit={salvarVideo} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        
        <div>
          <label>URL do Vídeo no YouTube:</label>
          <input 
            type="text" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)} 
            placeholder="Ex: https://www.youtube.com/watch?v=..."
            required 
            style={inputStyle}
          />
        </div>

        <div>
          <label>Título do Vídeo:</label>
          <input 
            type="text" 
            value={titulo} 
            onChange={(e) => setTitulo(e.target.value)} 
            placeholder="Ex: Final Sub-12 - Jogo Completo"
            required 
            style={inputStyle}
          />
        </div>

        <div>
          <label>Informações Adicionais (Admin):</label>
          <textarea 
            value={infoExtra} 
            onChange={(e) => setInfoExtra(e.target.value)} 
            placeholder="Ex: Escalação, destaques da partida, patrocinadores..."
            rows="4"
            required 
            style={inputStyle}
          />
        </div>

        <button type="submit" style={btnStyle}>Salvar no Firebase</button>
      </form>

      {mensagem && <p style={{ marginTop: '20px', color: '#00ff88' }}>{mensagem}</p>}
    </div>
  );
}

// Estilos embutidos para facilitar agora
const inputStyle = {
  width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: 'none', backgroundColor: '#333', color: '#fff'
};

const btnStyle = {
  padding: '12px', backgroundColor: '#e62117', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'
};