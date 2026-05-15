import { useState, useRef, useEffect } from 'react';
import { db, messaging } from './firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import './Home.css'; 

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [videoAtual, setVideoAtual] = useState(null);
  const [busca, setBusca] = useState('');
  const [autoplay, setAutoplay] = useState(0);
  const [mostrarStats, setMostrarStats] = useState(true);
  const [splashImg, setSplashImg] = useState(null);
  const [mostrarSplash, setMostrarSplash] = useState(false);
  
  // NOVO: Controle do botão "Ver mais"
  const [descricaoExpandida, setDescricaoExpandida] = useState(false);
  
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
      if (docSnap.exists()) setMostrarStats(docSnap.data().mostrarStats ?? true);
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

    const unsubscribeMensagens = onMessage(messaging, (payload) => {
      console.log('Alerta recebido!', payload);
      alert(`📢 NOVO ALERTA:\n\n${payload.notification.title}\n${payload.notification.body}`);
    });

    return () => { unsubscribeVideos(); unsubscribeConfig(); unsubSplash(); unsubscribeMensagens(); };
  }, [videoAtual, splashImg]);

  const pedirPermissaoNotificacao = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { vapidKey: 'BKQttoVmCcyQH5J4wKalKmTTBde-Hi3HD2Dmi4wgczitfNSu58kJ6tBWC96WI7PiouYIgwTOa_vTFzQspe9vBu8' });
        if (token) {
          await setDoc(doc(db, 'tokens', token), { token: token, data: new Date() });
          alert('🔔 Uhuu! Você ativou os alertas e está a apoiar a nossa equipa!');
        }
      } else {
        alert('Você bloqueou os alertas. Ative no cadeado do navegador para não perder nenhum jogo!');
      }
    } catch (error) {
      alert('Ops! Os alertas não são suportados neste dispositivo ainda.');
    }
  };

  const videosFiltrados = videos.filter(video => 
    !video.oculto && (video.title.toLowerCase().includes(busca.toLowerCase()) || (video.extraInfo && video.extraInfo.toLowerCase().includes(busca.toLowerCase())))
  );

  const tocarVideo = (video) => {
    setVideoAtual(video);
    setAutoplay(1);
    setDescricaoExpandida(false); // Fecha a descrição ao trocar de vídeo
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
          text: 'Venha apoiar os nossos atletas! Assista aos melhores jogos aqui.',
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
    <div className="app-container" translate="no">

      return (
    <div className="app-container" translate="no">
      
      {/* BOTÃO FLUTUANTE PARA O ADMIN */}
      <a href="/admin" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, backgroundColor: '#e62117', color: '#fff', width: '55px', height: '55px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '26px', boxShadow: '0 4px 15px rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.2)' }}>
        ⚙️
      </a>

      {mostrarSplash && (
    
        <div onClick={() => setMostrarSplash(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
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
        <div className="player-wrapper-master" key={`player-${videoAtual.id}`}>
          
          {/* TÍTULO COM LETREIRO CORRENDO */}
          <div className="titulo-topo-player">
            <div className="marquee-container">
              <span dangerouslySetInnerHTML={{ __html: videoAtual.title }}></span>
            </div>
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
            
            {/* DESCRIÇÃO COM VER MAIS */}
            <div className="descricao-container">
              <p className={`admin-info ${descricaoExpandida ? 'expandido' : 'truncado'}`} dangerouslySetInnerHTML={{ __html: videoAtual.extraInfo }}></p>
              {videoAtual.extraInfo && videoAtual.extraInfo.length > 80 && (
                <button className="btn-ver-mais" onClick={() => setDescricaoExpandida(!descricaoExpandida)}>
                  {descricaoExpandida ? 'Ver menos' : 'Ler mais'}
                </button>
              )}
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn-action" onClick={compartilharApp}>📤 Compartilhar</button>
            <a href={`https://www.youtube.com/watch?v=${videoAtual.videoId || pegarIdDoVideo(videoAtual.url)}`} target="_blank" rel="noopener noreferrer" className="btn-action">👍 Curtir</a>
            <button className="btn-action" onClick={pedirPermissaoNotificacao} style={{ background: '#07700c', color: '#fff' }}>🔔 Alertas</button>
            <a href="https://www.youtube.com/@futebolraiz-fg?sub_confirmation=1" target="_blank" rel="noopener noreferrer" className="btn-action btn-inscrever">🔴 Inscrever-se</a>
          </div>
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }} key="loading-state"><p>A carregar vídeos...</p></div>
      )}

      <div className="search-container">
        <input type="text" placeholder="Procurar vídeos..." value={busca} onChange={(e) => setBusca(e.target.value)} className="search-input" />
      </div>

      <h3 className="secao-titulo">Últimos Vídeos</h3>
      <div className="video-scroll-container">
        {videosFiltrados.map((video, index) => (
          <div key={`list-${video.id}-${index}`} className={`video-card-horizontal ${videoAtual?.id === video.id ? 'active-card' : ''}`} onClick={() => tocarVideo(video)}>
            <div className="thumb-container">
              <img 
                src={video.thumb.replace('maxresdefault', 'hqdefault')} 
                alt="Miniatura" 
                className="thumbnail" 
                onError={(e) => {
                  if (!e.target.src.includes('hqdefault.jpg')) { e.target.src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`; } 
                  else { e.target.src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`; }
                }}
              />
              <div className="play-overlay">▶</div>
            </div>
            <div className="card-info">
              <span className="video-date">{formatarData(video.dataCadastro)}</span>
              <p className="card-title-small" dangerouslySetInnerHTML={{ __html: video.title }}></p>
            </div>
          </div>
        ))}
      </div>

      <footer className="app-footer">
        {/* ... (conteúdo do rodapé mantido igual) ... */}
        <div className="footer-content">
          <div className="footer-section">
            <h4>🎥 Transmita seu Campeonato</h4>
            <p>Aumente a visibilidade do seu torneio com transmissões ao vivo em alta qualidade.</p>
            <a href="https://wa.me/5519998584530?text=Olá%20Flávio!%20Quero%20fazer%20uma%20transmissão." target="_blank" rel="noopener noreferrer" className="btn-whatsapp">📲 Orçamento de Transmissão</a>
          </div>
          <div className="footer-section sponsor-section">
            <h4>🚀 Divulgue sua Marca</h4>
            <p>Apareça para milhares de apaixonados por futebol! Anuncie na tela de abertura do App.</p>
            <a href="https://wa.me/5519998584530?text=Olá%20Flávio!%20Tenho%20interesse%20em%20anunciar." target="_blank" rel="noopener noreferrer" className="btn-whatsapp btn-sponsor">💼 Seja um Patrocinador</a>
          </div>
          <div className="footer-section dev-contact">
            <h4>💻 Desenvolvedor</h4>
            <span className="dev-name">Geraldo Filho</span>
            <p>Tenha um App profissional como este para alavancar o seu negócio.</p>
            <a href="https://wa.me/5519999371408" className="dev-link">📱 WhatsApp: (19) 99937-1408</a>
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