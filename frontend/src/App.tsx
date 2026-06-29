import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

function App() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Silakan pilih file terlebih dahulu!');
      return;
    }
    if (!query.trim()) {
      alert('Silakan masukkan pertanyaan Anda!');
      return;
    }

    setIsLoading(true);
    setAnswer('');
    setStatus('Mengirim permintaan...');

    const formData = new FormData();
    formData.append('file', selectedFile); 
    formData.append('query', query);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Gagal menghubungi server');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break; 

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
       
        for (const line of lines) {
          if (line.trim() === '') continue;

          try {
            const parsedData = JSON.parse(line);

            if (parsedData.status) {
              setStatus(parsedData.status);
            } 
            else if (parsedData.message) {
              setStatus(parsedData.status)
              setAnswer((prev) => prev + parsedData.message);
            }
            else if (parsedData.error) {
              setStatus('error');
              setAnswer('Terjadi kesalahan')
            }
          } catch (err) {
            console.error('Gagal parse baris JSON:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setAnswer('Terjadi kesalahan pada server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-layout">
      <nav className="neon-navbar">
        <div className="navbar-brand">
          <span className="navbar-logo">🤖</span>
          <span className="navbar-title">Agentic RAG AI</span>
        </div>
        <div className="navbar-actions">
          <button 
            className="theme-toggle" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Dark/Light Mode"
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className="app-container">
          <div className="neon-wrapper">
            <p className="subtitle">Retrieval-Augmented Generation</p>
        
        <form onSubmit={handleSubmit} className="chat-form">
          <div className="file-upload-container">
            <label className="file-label">
              <span className="file-icon">📄</span> 
              Pilih Dokumen Anda
            </label>
            <input 
              type="file" 
              accept=".pdf,.txt,.docx" 
              onChange={handleFileChange} 
              disabled={isLoading}
              className="file-input"
            />
            {selectedFile && <div className="file-selected">Terpilih: {selectedFile.name}</div>}
          </div>

          <div className="input-group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tanyakan sesuatu pada dokumen..."
              className="neon-input"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading} className="neon-button">
              {isLoading ? 'Memproses...' : 'Kirim'}
            </button>
          </div>
        </form>

        <div className="response-container">
          <div className="status-badge">
            <span className="pulse-dot"></span>
            Status: <strong>{status || 'Menunggu aksi'}</strong>
          </div>
          
          <div className="answer-box">
            {(answer || isLoading) && (
              <div className="answer-text">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {answer + (isLoading ? ' ▍' : '')}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
