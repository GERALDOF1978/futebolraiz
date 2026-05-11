import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import './Home.css'; 

export default function Home() {
  // Agora os vídeos começam vazios e o vídeo atual é nulo
  const [videos, setVideos] = useState([]);
  const [videoAtual, setVideoAtual] = useState(null);
  const [busca, setBusca] = useState('');
  const playerContainerRef = useRef(null);

  // Busca os vídeos no Firebase em tempo real
  useEffect(() => {
    // Busca na coleção "videos", ordenando do mais novo para o mais antigo
    const q = query(collection(db, "videos"), orderBy("dataCadastro", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setVideos(videosData);
      
      // Se tiver vídeos e nenhum estiver tocando, coloca o primeiro em destaque
      if (videosData.length > 0 && !videoAtual) {
        setVideoAtual(videosData[0]);
      }
    });

    // Limpa a escuta quando sair da tela
    return () => unsubscribe();
  }, [videoAtual]);

  // Filtra os vídeos com base no que foi digitado na busca
  const videosFiltrados = videos.filter(video => 
    video.title.toLowerCase().includes(busca.toLowerCase()) || 
    (video.extraInfo && video.extraInfo.toLowerCase().includes(busca.toLowerCase()))
  );

  const tocarVideo = (video) => {
    setVideoAtual(video);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const virarTela = async () => {
    const elemento = playerContainerRef.current;
    if (elemento) {
      if (!document.fullscreenElement) {
        await elemento.requestFullscreen().catch(err => {
          console.log(`Erro ao tentar tela cheia: ${err.message}`);
        });
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
      <header className="header">
        <div className="logo-box">⚽</div>
        <h1 className="canal-nome">Futebol Raiz - FG</h1>
      </header>

      {/* Só mostra o player se tiver algum vídeo selecionado */}
      {videoAtual ? (
        <>
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

          <div className="video-info">
            <h2>{videoAtual.title}</h2>
            <p className="admin-info">📝 {videoAtual.extraInfo}</p>
          </div>
        </>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Carregando vídeos ou nenhum vídeo cadastrado ainda...</p>
        </div>
      )}

      <div className="search-container">
        <input 
          type="text" 
          placeholder="Buscar vídeos..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="search-input"
        />
      </div>

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
        {videosFiltrados.length === 0 && videos.length > 0 && (
          <p className="no-results">Nenhum vídeo encontrado para essa busca.</p>
        )}
      </div>
    </div>
  );
}