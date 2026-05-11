import { useState, useRef, useEffect } from 'react';
import { db } from './firebase';
// Adicionamos 'doc' para ler as configurações
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import './Home.css'; 

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [videoAtual, setVideoAtual] = useState(null);
  const [busca, setBusca] = useState('');
  const [autoplay, setAutoplay] = useState(0);
  
  // ESTADO QUE CONTROLA SE AS ESTATÍSTICAS APARECEM OU NÃO
  const [mostrarStats, setMostrarStats] = useState(true);
  
  const playerContainerRef = useRef(null);

  useEffect(() => {
    // 1. Busca os vídeos
    const q = query(collection(db, "videos"), orderBy("dataCadastro", "desc"));
    const unsubscribeVideos = onSnapshot(q, (snapshot) => {
      const videosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(videosData);
      if (videosData.length > 0 && !videoAtual) {
        setVideoAtual(videosData[0]);
      }
    });

    // 2. Escuta o botão liga/desliga do painel Admin
    const unsubscribeConfig = onSnapshot(doc(db, "config", "geral"), (docSnap) => {
      if (docSnap.exists()) {
        // Se a chave existir no banco, atualiza o estado
        setMostrarStats(docSnap.data().mostrarStats ?? true);
      }
    });

    return () => { unsubscribeVideos(); unsubscribeConfig(); };
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

  const compartilharApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Futebol Raiz - FG',
          text: 'Baixe o app e assista aos melhores jogos de futebol society e base!',
          url: window.location.origin, 
        });
      } catch (error) {
        console.log('Compartilhamento cancelado');
      }
    } else {
      alert(`Copie o link para compartilhar: ${window.location.origin}`);
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
      <header className="header-banner">
        <div className="banner-overlay"></div>
        <div className="header-content">
          <img 
            src="https://i.ibb.co/jZ5x1t1g/loginho.png" 
            alt="Logo Futebol Raiz" 
            className="header-logo" 
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
        </div>
      </header>

      {videoAtual ? (
        <>
          <div className="player-section" ref={playerContainerRef}>
            <div className="player-wrapper">
              <div className="escudo-topo"></div>
              <div className="escudo-rodape"></div>
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
          
          <div className="video-info">
            <h2>{videoAtual.title}</h2>
            
            {/* AQUI ESTÁ A MÁGICA: Só renderiza essa barra se o Admin deixar! */}
            {mostrarStats && (
              <div className="status-bar">
                 <span>👁️ {videoAtual.views || 0} visualizações</span>
                 <span>👍 {videoAtual.likes || 0} curtidas</span>
                 <span>🏟️ Local: {videoAtual.local || 'Não informado'}</span>
              </div>
            )}

            <p className="admin-info">{videoAtual.extraInfo}</p>
          </div>

          <div className="action-buttons">
            <button className="btn-action" onClick={compartilharApp}>
              📤 Compartilhar App
            </button>
            <a 
              href={`https://www.youtube.com/watch?v=${videoAtual.videoId || pegarIdDoVideo(videoAtual.url)}`} 
              target="_blank" rel="noopener noreferrer" 
              className="btn-action"
            >
              👍 Deixar Like
            </a>
            <a 
              href="https://www.youtube.com/@futebolraiz-fg?sub_confirmation=1" 
              target="_blank" rel="noopener noreferrer" 
              className="btn-action btn-inscrever"
            >
              🔔 Inscrever-se
            </a>
          </div>
        </>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}><p>Carregando vídeos...</p></div>
      )}

      <div className="search-container">
        <input 
          type="text" 
          placeholder="Buscar vídeos, times, campeonatos..." 
          value={busca} 
          onChange={(e) => setBusca(e.target.value)} 
          className="search-input" 
        />
      </div>

      <h3 className="secao-titulo">Últimos Vídeos</h3>
      <div className="video-scroll-container">
        {videosFiltrados.map((video) => (
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
          <p className="no-results">Nenhum vídeo encontrado para essa busca.</p>
        )}
      </div>
    </div>
  );
}