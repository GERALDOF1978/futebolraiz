import { useState, useRef, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import './Home.css'; 

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [videoAtual, setVideoAtual] = useState(null);
  const [busca, setBusca] = useState('');
  const [autoplay, setAutoplay] = useState(0);
  
  // ESTADO QUE CONTROLA SE AS ESTATÍSTICAS APARECEM OU NÃO
  const [mostrarStats, setMostrarStats] = useState(true);

  // ==========================================
  // ESTADOS DO SPLASH SCREEN (ANÚNCIO)
  // ==========================================
  const [splashImg, setSplashImg] = useState(null);
  const [mostrarSplash, setMostrarSplash] = useState(false);
  
  const playerContainerRef = useRef(null);

  useEffect(() => {
    // 1. Busca os vídeos e ignora os ocultos
    const q = query(collection(db, "videos"), orderBy("dataCadastro", "desc"));
    const unsubscribeVideos = onSnapshot(q, (snapshot) => {
      const videosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(videosData);
      
      const videosVisiveis = videosData.filter(v => !v.oculto);
      
      if (videosVisiveis.length > 0 && !videoAtual) {
        setVideoAtual(videosVisiveis[0]);
      }
    });

    // 2. Escuta o botão liga/desliga de estatísticas do painel Admin
    const unsubscribeConfig = onSnapshot(doc(db, "config", "geral"), (docSnap) => {
      if (docSnap.exists()) {
        setMostrarStats(docSnap.data().mostrarStats ?? true);
      }
    });

    // 3. Escuta as configurações do Splash Screen
    const unsubSplash = onSnapshot(doc(db, "config", "splash"), (docSnap) => {
      if (docSnap.exists()) {
        const dados = docSnap.data();
        const agora = new Date();
        const expira = new Date(dados.expiraEm);

        // Se estiver ativo, a data não venceu e a imagem ainda não foi carregada nesta sessão
        if (dados.ativo && agora < expira && !splashImg) {
          setSplashImg(dados.urlImagem);
          setMostrarSplash(true);
          
          // O Splash some automaticamente após 7 a 10 segundos (aqui configurado para 7000ms)
          setTimeout(() => {
            setMostrarSplash(false);
          }, 7000);
        }
      }
    });

    return () => { unsubscribeVideos(); unsubscribeConfig(); unsubSplash(); };
  }, [videoAtual, splashImg]);

  // Filtra por busca e garante que os ocultos não apareçam
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
      
      {/* ========================================== */}
      {/* 🚀 TELA DE SPLASH (SOBREPÕE TUDO) */}
      {/* ========================================== */}
      {mostrarSplash && (
        <div 
          onClick={() => setMostrarSplash(false)} // Some na hora se o usuário tocar na tela
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: '#000', zIndex: 99999, display: 'flex',
            justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
          }}
        >
          <img 
            src={splashImg} 
            alt="Anúncio Patrocinador" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
      )}

      {/* CABEÇALHO COM LOGO OFICIAL */}
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
            
            {/* Só renderiza essa barra se o Admin deixar */}
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

{/* ========================================== */}
      {/* RODAPÉ PROFISSIONAL (VENDA, LINKS E DEV) */}
      {/* ========================================== */}
      <footer className="app-footer">
        <div className="footer-content">
          
          <div className="footer-section">
            <h4>🎥 Transmissões & Parcerias</h4>
            <p>
              Leve a emoção do seu campeonato para o mundo! Realizamos transmissões ao vivo profissionais via YouTube para jogos de futebol society, base e eventos. Quer destacar sua marca? Anuncie conosco!
            </p>
            <a 
              href="https://wa.me/5519998584530?text=Olá%20Flavio!%20Vim%20pelo%20App%20Futebol%20Raiz.%20Gostaria%20de%20saber%20mais%20sobre%20transmissões%20e%20parcerias." 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-whatsapp"
            >
              📲 Falar com Flavio Gava
            </a>
          </div>
          
          <div className="footer-section links-section">
            <h4>📜 Institucional</h4>
            <ul>
              <li><a href="#termos" onClick={(e) => { e.preventDefault(); alert("Termos de Uso em atualização."); }}>Termos de Serviço</a></li>
              <li><a href="#privacidade" onClick={(e) => { e.preventDefault(); alert("Política de Privacidade em atualização."); }}>Política de Privacidade</a></li>
              <li><a href="#regras" onClick={(e) => { e.preventDefault(); alert("Regras de conduta da comunidade em atualização."); }}>Regras da Comunidade</a></li>
            </ul>
          </div>

          {/* AQUI ENTRA A SUA ASSINATURA DE DESENVOLVEDOR */}
          <div className="footer-section dev-section">
            <h4>💻 Desenvolvedor</h4>
            <p>Quer um aplicativo exclusivo e profissional igual a este para o seu negócio ou projeto?</p>
            <div className="dev-contact">
               <span className="dev-name">👨‍💻 Geraldo Filho</span>
               <a 
                 href="https://wa.me/5519999371408?text=Olá%20Geraldo!%20Acessei%20o%20app%20Futebol%20Raiz%20e%20gostaria%20de%20um%20orçamento%20para%20criar%20um%20aplicativo." 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="dev-link"
               >
                 📱 WhatsApp: (19) 99937-1408
               </a>
               <a href="mailto:geraldof1978@gmail.com" className="dev-link">
                 ✉️ geraldof1978@gmail.com
               </a>
            </div>
          </div>

        </div>

      <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Futebol Raiz - FG. Todos os direitos reservados.</p>
        </div>
      </footer>

    </div>
  );
}