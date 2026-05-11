import { useState, useRef } from 'react';
import ReactPlayer from 'react-player/youtube';
import './Home.css'; // Vamos criar este arquivo de estilo a seguir

// Dados de exemplo simulando o que virá do Firebase/Admin
const VIDEOS_MOCK = [
  { 
    id: '1', 
    title: 'Melhores Momentos - Sub-12', 
    url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 
    thumb: 'https://img.youtube.com/vi/ysz5S6PUM-U/hqdefault.jpg', 
    extraInfo: 'Grande partida! Destaque para a defesa.' 
  },
  { 
    id: '2', 
    title: 'Gols da Rodada', 
    url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', 
    thumb: 'https://img.youtube.com/vi/jNQXAC9IVRw/hqdefault.jpg', 
    extraInfo: 'Compilado com todos os gols do final de semana.' 
  },
  { 
    id: '3', 
    title: 'Treino Tático e Preparação', 
    url: 'https://www.youtube.com/watch?v=tpiyEe_CqB4', 
    thumb: 'https://img.youtube.com/vi/tpiyEe_CqB4/hqdefault.jpg', 
    extraInfo: 'Foco total no posicionamento em campo.' 
  }
];

export default function Home() {
  const [videoAtual, setVideoAtual] = useState(VIDEOS_MOCK[0]);
  const [busca, setBusca] = useState('');
  const playerContainerRef = useRef(null);

  // Filtra os vídeos com base no que foi digitado na busca
  const videosFiltrados = VIDEOS_MOCK.filter(video => 
    video.title.toLowerCase().includes(busca.toLowerCase()) || 
    video.extraInfo.toLowerCase().includes(busca.toLowerCase())
  );

  // Função para tocar o vídeo clicado e rolar para o topo
  const tocarVideo = (video) => {
    setVideoAtual(video);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Função para virar a tela (Fullscreen + Landscape no celular)
  const virarTela = async () => {
    const elemento = playerContainerRef.current;
    if (elemento) {
      if (!document.fullscreenElement) {
        await elemento.requestFullscreen().catch(err => {
          console.log(`Erro ao tentar tela cheia: ${err.message}`);
        });
        // Tenta forçar a orientação para paisagem em dispositivos móveis
        if (window.screen && window.screen.orientation) {
          try {
            await window.screen.orientation.lock('landscape');
          } catch (error) {
            console.log("Rotação automática não suportada neste dispositivo.");
          }
        }
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="app-container">
      {/* CABEÇALHO */}
      <header className="header">
        <div className="logo-box">⚽</div> {/* Espaço para o logo real */}
        <h1 className="canal-nome">Futebol Raiz - FG</h1>
      </header>

      {/* ÁREA DO PLAYER */}
      <div className="player-section" ref={playerContainerRef}>
        <div className="player-wrapper">
          <ReactPlayer 
            url={videoAtual.url} 
            playing={true} 
            controls={true} 
            width="100%" 
            height="100%" 
            className="react-player"
          />
        </div>
        <button className="btn-virar-tela" onClick={virarTela}>
          ⛶ Virar Tela
        </button>
      </div>

      {/* INFORMAÇÕES DO VÍDEO (Vindo do Admin) */}
      <div className="video-info">
        <h2>{videoAtual.title}</h2>
        <p className="admin-info">📝 {videoAtual.extraInfo}</p>
      </div>

      {/* BARRA DE BUSCA */}
      <div className="search-container">
        <input 
          type="text" 
          placeholder="Buscar vídeos..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="search-input"
        />
      </div>

      {/* LISTA DE CARDS (Miniaturas) */}
      <div className="video-grid">
        {videosFiltrados.map((video) => (
          <div key={video.id} className="video-card" onClick={() => tocarVideo(video)}>
            <div className="thumb-container">
              <img src={video.thumb} alt={video.title} className="thumbnail" />
              <div className="play-overlay">▶</div>
            </div>
            <div className="card-info">
              <h3>{video.title}</h3>
            </div>
          </div>
        ))}
        {videosFiltrados.length === 0 && (
          <p className="no-results">Nenhum vídeo encontrado.</p>
        )}
      </div>
    </div>
  );
}