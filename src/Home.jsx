import { useState, useRef, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import './Home.css'; 

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [videoAtual, setVideoAtual] = useState(null);
  const [busca, setBusca] = useState('');
  const [autoplay, setAutoplay] = useState(0);
  
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
    setAutoplay(1);
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

  const formatarData = (dataFirebase) => {
    if (!dataFirebase) return '';
    const data = dataFirebase.toDate ? dataFirebase.toDate() : new Date(dataFirebase);
    return data.toLocaleDateString('pt-BR');
  };

  const pegarIdDoVideo = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  return (
    <div className="app-container">
      {/* CABEÇALHO SÓ COM BANNER E LOGO (Título removido) */}
      <header className="header-banner">
        <div className="banner-overlay"></div>
        <div className="header-content">
          <img 
            src="https://yt3.googleusercontent.com/nihxmU1qKISJiz-FddGHYk6VA2dEteXe7ZtwSjC1goE3byavO9HNJ-HkTW1iduHKv0Pimd6nDqA=w1060-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj" 
            alt="Logo" 
            className="header-logo" 
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
        </div>
      </header>

      {videoAtual ? (
        <>
          <div className="player-section" ref={playerContainerRef}>
            <div className="player-wrapper">
              {/* O atributo SANDBOX abaixo é a cadeia que prende o YouTube no seu app */}
              <iframe 
                className="react-player"
                src={`https://www.youtube.com/embed/${videoAtual.videoId || pegarIdDoVideo(videoAtual.url)}?autoplay=${autoplay}&modestbranding=1&rel=0&fs=0`}
                title={videoAtual.title}
                frameBorder="0"
                sandbox="allow-scripts allow-same-origin allow-presentation" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <button className="btn-virar-tela" onClick={virarTela}>⛶</button>
          </div>
          
          {/* TÍTULO E DESCRIÇÃO CHAMATIVOS */}
          <div className="video-info">
            <h2>{videoAtual.title}</h2>
            <p className="admin-info">{videoAtual.extraInfo}</p>
          </div>
        </>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}><p>Carregando vídeos...</p></div>
      )}

      <div className="search-container">
        <input type="text" placeholder="Buscar vídeos..." value={busca} onChange={(e) => setBusca(e.target.value)} className="search-input" />
      </div>

      <h3 className="secao-titulo">Últimos Vídeos</h3>
      <div className="video-scroll-container">
        {videosFiltrados.map((video) => (
          /* AQUI ADICIONAMOS A CLASSE 'active-card' SE FOR O VÍDEO ATUAL */
          <div 
            key={video.id} 
            className={`video-card-horizontal ${videoAtual?.id === video.id ? 'active-card' : ''}`} 
            onClick={() => tocarVideo(video)}
          >
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