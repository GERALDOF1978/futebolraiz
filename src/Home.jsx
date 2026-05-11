import { useState, useRef, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import './Home.css'; 

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [videoAtual, setVideoAtual] = useState(null);
  const [busca, setBusca] = useState('');
  const [autoplay, setAutoplay] = useState(0);
  const [mostrarStats, setMostrarStats] = useState(true);
  const [splashImg, setSplashImg] = useState(null);
  const [mostrarSplash, setMostrarSplash] = useState(false);
  
  const playerContainerRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "videos"), orderBy("dataCadastro", "desc"));
    const unsubscribeVideos = onSnapshot(q, (snapshot) => {
      const videosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(videosData);
      
      const videosVisiveis = videosData.filter(v => !v.oculto);
      if (videosVisiveis.length > 0 && !videoAtual) {
        setVideoAtual(videosVisiveis[0]);
      }
    });

    const unsubscribeConfig = onSnapshot(doc(db, "config", "geral"), (docSnap) => {
      if (docSnap.exists()) {
        setMostrarStats(docSnap.data().mostrarStats ?? true);
      }
    });

    const unsubSplash = onSnapshot(doc(db, "config", "splash"), (docSnap) => {
      if (docSnap.exists()) {
        const dados = docSnap.data();
        const agora = new Date();
        const expira = new Date(dados.expiraEm);
        if (dados.ativo && agora < expira && !splashImg) {
          setSplashImg(dados.urlImagem);
          setMostrarSplash(true);
          setTimeout(() => setMostrarSplash(false), 7000);
        }
      }
    });

    return () => { unsubscribeVideos(); unsubscribeConfig(); unsubSplash(); };
  }, [videoAtual, splashImg]);

  const videosFiltrados = videos.filter(video => 
    !video.oculto && 
    (video.title.toLowerCase().includes(busca.toLowerCase()) || 
    (video.extraInfo && video.extraInfo.toLowerCase().includes(busca.toLowerCase())))
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
          text: 'Assista aos melhores jogos de futebol society e base!',
          url: window.location.origin, 
        });
      } catch (error) {}
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
      {mostrarSplash && (
        <div 
          onClick={() => setMostrarSplash(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: '#000', zIndex: 99999, display: 'flex',
            justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
          }}
        >
          <img src={splashImg} alt="Anúncio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <header className="header-banner">
        <div className="banner-overlay"></div>
        <div className="header-content">
          <img src="https://i.ibb.co/jZ5x1t1g/loginho.png" alt="Logo" className="header-logo" />
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
            {/* RESOLUÇÃO DO ERRO: Envolver texto em span impede quebras de tradução */}
            <h2 dangerouslySetInnerHTML={{ __html: videoAtual.title }}></h2>
            {mostrarStats && (
              <div className="status-bar">
                 <span>👁️ {videoAtual.views || 0}</span>
                 <span>👍 {videoAtual.likes || 0}</span>
                 <span>🏟️ {videoAtual.local || 'Local N/I'}</span>
              </div>
            )}
            <p className="admin-info" dangerouslySetInnerHTML={{ __html: videoAtual.extraInfo }}></p>
          </div>

          <div className="action-buttons">
            <button className="btn-action" onClick={compartilharApp}>📤 Partilhar</button>
            <a href={`https://www.youtube.com/watch?v=${videoAtual.videoId || pegarIdDoVideo(videoAtual.url)}`} target="_blank" rel="noopener noreferrer" className="btn-action">👍 Like</a>
            <a href="https://www.youtube.com/@futebolraiz-fg?sub_confirmation=1" target="_blank" rel="noopener noreferrer" className="btn-action btn-inscrever">🔔 Subscrever</a>
          </div>
        </>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}><p>A carregar vídeos...</p></div>
      )}

      <div className="search-container">
        <input type="text" placeholder="Procurar vídeos..." value={busca} onChange={(e) => setBusca(e.target.value)} className="search-input" />
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
              <img 
                src={video.thumb} 
                alt={video.title} 
                className="thumbnail" 
                onError={(e) => {
                  if (!e.target.src.includes('hqdefault.jpg')) {
                    e.target.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
                  }
                }}
              />
              <div className="play-overlay">▶</div>
            </div>
            <div className="card-info">
              <span className="video-date">{formatarData(video.dataCadastro)}</span>
              {/* RESOLUÇÃO DO ERRO AQUI TAMBÉM */}
              <h3 dangerouslySetInnerHTML={{ __html: video.title }}></h3>
            </div>
          </div>
        ))}
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>🎥 Transmissões</h4>
            <p>Leve a emoção do seu campeonato para o mundo!</p>
            <a href="https://wa.me/5519998584530" target="_blank" rel="noopener noreferrer" className="btn-whatsapp">📲 Contactar Flávio</a>
          </div>
          <div className="footer-section dev-contact">
            <h4>💻 Desenvolvedor</h4>
            <span className="dev-name">Geraldo Filho</span>
            <a href="https://wa.me/5519999371408" className="dev-link">📱 (19) 99937-1408</a>
            <a href="mailto:geraldof1978@gmail.com" className="dev-link">✉️ geraldof1978@gmail.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}