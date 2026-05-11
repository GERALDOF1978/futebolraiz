import { useState } from 'react';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import Papa from 'papaparse'; // Leitor do CSV

export default function Admin() {
  const [url, setUrl] = useState('');
  const [titulo, setTitulo] = useState('');
  const [infoExtra, setInfoExtra] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [msgLote, setMsgLote] = useState('');

  // Converte a data do CSV (ex: 2026-05-10 08:49:43) para o Firebase
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

  // FUNÇÃO MÁGICA DE IMPORTAR O CSV
  const importarCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setMsgLote('Lendo arquivo CSV e importando para o Firebase. Aguarde...');
    
    Papa.parse(file, {
      header: true, // Avisa que a primeira linha tem os nomes das colunas
      skipEmptyLines: true,
      complete: async (results) => {
        const linhas = results.data;
        let contador = 0;

        for (let linha of linhas) {
          if (!linha.videoId) continue; // Pula linhas vazias

          try {
            await addDoc(collection(db, "videos"), {
              videoId: linha.videoId,
              url: `https://www.youtube.com/watch?v=${linha.videoId}`,
              title: linha.videoTitle || 'Sem Título',
              thumb: `https://img.youtube.com/vi/${linha.videoId}/maxresdefault.jpg`, // Pega a thumb em alta qualidade
              extraInfo: linha.videoDescription || '',
              dataCadastro: converterDataCSV(linha.publishedAtSQL),
              // NOVAS INFORMAÇÕES:
              views: linha.viewCount || '0',
              likes: linha.likeCount || '0',
              local: linha.locationDescription || 'Não informado'
            });
            contador++;
          } catch (error) {
            console.error("Erro ao importar: ", error);
          }
        }
        setMsgLote(`🎉 Sucesso! ${contador} vídeos foram importados do CSV para o App!`);
      },
      error: (error) => {
        setMsgLote(`Erro ao ler arquivo: ${error.message}`);
      }
    });
  };

  // Salvar vídeo manual (mantivemos)
  const salvarVideo = async (e) => {
    e.preventDefault();
    setMensagem('Salvando...');
    const videoId = pegarIdDoVideo(url);
    if (!videoId) { setMensagem('URL inválida!'); return; }
    try {
      await addDoc(collection(db, "videos"), {
        videoId: videoId, url: url, title: titulo, thumb: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        extraInfo: infoExtra, dataCadastro: new Date(), views: 0, likes: 0, local: 'Adicionado Manualmente'
      });
      setMensagem('Salvo com sucesso!'); setUrl(''); setTitulo(''); setInfoExtra('');
    } catch (error) { setMensagem('Erro ao salvar.'); }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
      <h2 style={{ color: '#e62117' }}>Painel Admin - Futebol Raiz FG</h2>
      
      {/* UPLOAD DO CSV */}
      <div style={{ background: '#222', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
        <h3>📁 Importar Arquivo CSV (YouTube)</h3>
        <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '15px' }}>
          Selecione o arquivo CSV do seu canal para importar todos os vídeos com visualizações, curtidas e local.
        </p>
        <input type="file" accept=".csv" onChange={importarCSV} style={inputStyle} />
        {msgLote && <p style={{ marginTop: '10px', color: '#00ff88', fontWeight: 'bold' }}>{msgLote}</p>}
      </div>

      <hr style={{ borderColor: '#333', margin: '30px 0' }}/>

      <div style={{ background: '#111', padding: '20px', borderRadius: '10px' }}>
        <h3>➕ Cadastrar Vídeo Manualmente</h3>
        <form onSubmit={salvarVideo} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL do YouTube" required style={inputStyle} />
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" required style={inputStyle} />
          <textarea value={infoExtra} onChange={(e) => setInfoExtra(e.target.value)} placeholder="Informações Extras" rows="3" required style={inputStyle} />
          <button type="submit" style={btnStyle}>Salvar Vídeo</button>
        </form>
        {mensagem && <p style={{ marginTop: '15px', color: '#00ff88' }}>{mensagem}</p>}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px', marginTop: '5px', borderRadius: '5px', border: '1px solid #444', backgroundColor: '#000', color: '#fff', outline: 'none' };
const btnStyle = { padding: '14px', backgroundColor: '#e62117', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' };