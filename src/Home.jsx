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

  // Busca os vídeos no Firebase em tempo real
  useEffect(() => {
    const q = query(collection(db, "videos"), orderBy("dataCadastro", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVideos(videosData);
      
      // Quando abre o app, já seleciona o vídeo mais recente
      if (videosData.length > 0 && !videoAtual) {
        setVideoAtual(videosData[0]);
      }
    });
    return () => unsubscribe();
  }, [videoAtual]);

  // Filtro de busca
  const videosFiltrados = videos.filter(video => 
    video.title.toLowerCase().includes(busca.toLowerCase()) || 
    (video.extraInfo && video.extraInfo.toLowerCase().includes(busca.toLowerCase()))
  );

  // Função que roda ao clicar em um card de vídeo
  const tocarVideo = (video) => {
    setVideoAtual(video);
    setAutoplay(1); // Ativa o autoplay quando o usuário clica
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Função para forçar a tela cheia e virar o celular
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

  // Compartilhamento nativo do celular
  const compartilharApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Futebol Raiz - FG',
          text: 'Baixe o app e assista aos melhores jogos de futebol society e base!',
          url: window.location.origin, // Pega o link oficial do seu app na Vercel
        });
      } catch (error) {
        console.log('Compartilhamento cancelado');
      }
    } else {
      alert(`Copie o link para compartilhar: ${window.location.origin}`);
    }
  };

  // Formatação de datas
  const formatarData = (dataFirebase) => {
    if (!dataFirebase) return '';
    const data = dataFirebase.toDate ? dataFirebase.toDate() : new Date(dataFirebase);
    return data.toLocaleDateString('pt-BR');
  };

  // Extrai o ID do YouTube para colocar no Iframe
  const pegarIdDoVideo = (url) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  return (
    <div className="app-container">
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
              {/* ESCUDOS PARA BLOQUEAR O CLIQUE E NÃO SAIR DO APP */}
              <div className="escudo-topo"></div>
              <div className="escudo-rodape"></div>

              {/* PLAYER OFICIAL DO YOUTUBE (IFRAME) */}
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
            {/* BOTÃO TELA CHEIA */}
            <button className="btn-virar-tela" onClick={virarTela}>⛶</button>
          </div>
          
          {/* TÍTULO, ESTATÍSTICAS E DESCRIÇÃO */}
          <div className="video-info">
            <h2>{videoAtual.title}</h2>
            <div className="status-bar">
               <span>👁️ {videoAtual.views || 0} visualizações</span>
               <span>👍 {videoAtual.likes || 0} curtidas</span>
               <span>🏟️ Local: {videoAtual.local || 'Não informado'}</span>
            </div>
            <p className="admin-info">{videoAtual.extraInfo}</p>
          </div>

          {/* BOTÕES DE AÇÃO (PWA E INTEGRAÇÃO YOUTUBE) */}
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

      {/* BUSCA */}
      <div className="search-container">
        <input 
          type="text" 
          placeholder="Buscar vídeos, times, campeonatos..." 
          value={busca} 
          onChange={(e) => setBusca(e.target.value)} 
          className="search-input" 
        />
      </div>

      {/* LISTA DE VÍDEOS (CARROSSEL) */}
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