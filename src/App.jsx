// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Admin from './Admin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota pública do aplicativo */}
        <Route path="/" element={<Home />} />
        
        {/* Rota escondida para o painel de administração */}
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;