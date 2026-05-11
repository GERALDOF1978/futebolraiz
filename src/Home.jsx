import { useState, useRef, useEffect } from 'react';
import { db, messaging } from './firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
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
      const videosData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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

  const pedirPermissaoNotificacao = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { 
          vapidKey: 'BKQttoVmCcyQH5J4wKalKmTTBde-Hi3HD2Dmi4wgczitfNSu58kJ6tBWC96WI7PiouYIgwTOa_vTFzQspe9vBu8' 
        });
        if (token) {
          await setDoc(doc(db, 'tokens', token), { token: token, data: new Date() });
          alert('🔔 Uhuu! Você ativou os alertas. Obrigado por apoiar o Futebol Raiz!');
        }
      } else {
        alert('Você bloqueou os alertas. Ative no cadeado do navegador para não perder os jogos!');
      }
    } catch (error) {
      console.error('Erro ao ativar notificações:', error);
      alert('Ops! Os alertas não são suportados neste navegador/dispositivo ainda.');
    }
  };

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
          text: 'Venha apoiar nossos atletas! Assista aos melhores jogos de futebol society e base!',
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
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
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
          <div className="titulo-topo-player">
            <span>{videoAtual.title}</span>
          </div>

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
            <button className="btn-action" onClick={compartilharApp}>📤 Compartilhar</button>
            <a href={`https://www.youtube.com/watch?v=${videoAtual.videoId || pegarIdDoVideo(videoAtual.url)}`} target="_blank" rel="noopener noreferrer" className="btn-action">👍 Curtir</a>
            <button className="btn-action" onClick={pedirPermissaoNotificacao} style={{ background: '#e62117', color: '#fff' }}>🔔 Alertas</button>
            <a href="https://www.youtube.com/@futebolraiz-fg?sub_confirmation=1" target="_blank" rel="noopener noreferrer" className="btn-action btn-inscrever">🔴 Inscrever-se</a>
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
              <p className="card-title-small">{video.title}</p>
            </div>
          </div>
        ))}
      </div>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>🎥 Transmita seu Campeonato</h4>
            <p>Aumente a visibilidade do seu torneio com transmissões ao vivo em alta qualidade.</p>
            <a href="https://wa.me/5519998584530?text=Olá%20Flávio!%20Quero%20fazer%20uma%20transmissão%20do%20meu%20campeonato." target="_blank" rel="noopener noreferrer" className="btn-whatsapp">📲 Orçamento de Transmissão</a>
          </div>
          <div className="footer-section sponsor-section">
            <h4>🚀 Divulgue sua Marca</h4>
            <p>Apareça para milhares de apaixonados por futebol! Anuncie na tela de abertura do App.</p>
            <a href="https://wa.me/5519998584530?text=Olá%20Flávio!%20Tenho%20interesse%20em%20anunciar%20minha%20marca%20no%20app%20Futebol%20Raiz." target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sponsor">💼 Seja um Patrocinador</a>
          </div>
          <div className="footer-section dev-contact">
            <h4>💻 Desenvolvedor</h4>
            <span className="dev-name">Geraldo Filho</span>
            <p>Tenha um App profissional como este para alavancar o seu negócio.</p>
            <a href="https://wa.me/5519999371408?text=Olá%20Geraldo!%20Gostaria%20de%20um%20orçamento%20para%20criar%20um%20app." className="dev-link">📱 WhatsApp: (19) 99937-1408</a>
            <a href="mailto:geraldof1978@gmail.com" className="dev-link">✉️ E-mail: geraldof1978@gmail.com</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Futebol Raiz - FG. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}