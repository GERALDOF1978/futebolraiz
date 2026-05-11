import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import './Home.css'; 

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [videoAtual, setVideoAtual] = useState(null);
  const [busca, setBusca] = useState('');
  const playerContainerRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "videos"), orderBy("dataCadastro", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVideos(videosData);
      if (videosData.length > 0 && !videoAtual) {
        setVideoAtual(videosData[0]);
      }
    });
    return () => unsubscribe();
  }, [videoAtual]);

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
        await elemento.requestFullscreen().catch(err => console.log(err));
        if (window.screen && window.screen.orientation) {
          try { await window.screen.orientation.lock('landscape'); } catch (e) {}
        }
      } else {
        document.exitFullscreen();
      }
    }
  };

  // Função para formatar a data que vem do Firebase
  const formatarData = (dataFirebase) => {
    if (!dataFirebase) return '';
    // Converte o Timestamp do Firebase para Data do JavaScript
    const data = dataFirebase.toDate ? dataFirebase.toDate() : new Date(dataFirebase);
    return data.toLocaleDateString('pt-BR');
  };

  return (
    <div className="app-container">
      {/* CABEÇALHO COM BANNER E LOGO */}
      <header className="header-banner">
        <div className="banner-overlay"></div>
        <div className="header-content">
          {/* COLE O LINK DO SEU LOGO DENTRO DO src ABAIXO */}
          <img 
            src="COLE_O_LINK_DO_LOGO_AQUI" 
            alt="Logo" 
            className="header-logo" 
            onError={(e) => { e.target.style.display = 'none'; }} // Esconde se estiver vazio
          />
          <h1 className="canal-nome">Futebol Raiz - FG</h1>
        </div>
      </header>

      {videoAtual ? (
        <>
          <div className="player-section" ref={playerContainerRef}>
            <div className="player-wrapper">
              <ReactPlayer url={videoAtual.url} playing={true} controls={true} width="100%" height="100%" className="react-player" />
            </div>
            <button className="btn-virar-tela" onClick={virarTela}>⛶</button>
          </div>
          <div className="video-info">
            <h2>{videoAtual.title}</h2>
            <p className="admin-info">📝 {videoAtual.extraInfo}</p>
          </div>
        </>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}><p>Carregando vídeos...</p></div>
      )}

      <div className="search-container">
        <input type="text" placeholder="Buscar vídeos..." value={busca} onChange={(e) => setBusca(e.target.value)} className="search-input" />
      </div>

      {/* LISTA DE CARDS HORIZONTAL */}
      <h3 className="secao-titulo">Últimos Vídeos</h3>
      <div className="video-scroll-container">
        {videosFiltrados.map((video) => (
          <div key={video.id} className="video-card-horizontal" onClick={() => tocarVideo(video)}>
            <div className="thumb-container">
              <img src={video.thumb} alt={video.title} className="thumbnail" />
              <div className="play-overlay">▶</div>
            </div>
            <div className="card-info">
              <span className="video-date">{formatarData(video.dataCadastro)}</span>
              <h3>{video.title}</h3>
            </div>
          </div>
        ))}
        {videosFiltrados.length === 0 && videos.length > 0 && (
          <p className="no-results">Nenhum vídeo encontrado.</p>
        )}
      </div>
    </div>
  );
}