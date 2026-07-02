import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

function App() {
  const [query, setQuery] = useState('');
  const [link, setLink] = useState('');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleFileRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedFile(null);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedFile && !link.trim()) {
      alert('Silakan pilih file atau masukkan URL terlebih dahulu!');
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
    formData.append('query', query.trim());
    formData.append('file', selectedFile); 
    formData.append('link', link.trim());

    console.log(formData.get('file'));

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Gagal menghubungi server');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Reader is not available');
      
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
      setStatus("Terjadi masalah pada server...")
      setAnswer('Terjadi kesalahan pada server.');
    } finally {
      setIsLoading(false);
    }
  };

  let displayAnswer = answer;
  displayAnswer = displayAnswer.replace(/<think>[\s\S]*?<\/think>/gi, '');
  displayAnswer = displayAnswer.replace(/<think>[\s\S]*$/gi, '');

  return (
    <div className="page-layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <svg className="navbar-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
            <circle cx="12" cy="5" r="2"></circle>
            <path d="M12 7v4"></path>
            <line x1="8" y1="16" x2="8" y2="16"></line>
            <line x1="16" y1="16" x2="16" y2="16"></line>
          </svg>
          <span className="navbar-title">Agentic RAG</span>
        </div>
        <div className="navbar-actions">
          <button 
            className="theme-toggle" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Dark/Light Mode"
            aria-label="Toggle Theme"
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            )}
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className="app-container">
          <div className="header-section">
            <h1 className="title">Analisis Dokumen</h1>
            <p className="subtitle">Upload dokumen atau masukkan URL dan berikan pertanyaan untuk mengekstrak informasi menggunakan AI.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="action-form">
            <div className="file-upload-card">
              <input 
                type="file" 
                accept=".pdf,.txt,.docx" 
                onChange={handleFileChange} 
                disabled={isLoading}
                className="file-input-hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className={`file-label ${selectedFile ? 'has-file' : ''}`}>
                <div className="file-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div className="file-info">
                  <span className="file-name">{selectedFile ? selectedFile.name : 'Pilih Dokumen'}</span>
                  <span className="file-desc">{selectedFile ? 'Siap untuk analisis' : 'PDF, TXT, atau DOCX hingga 10MB'}</span>
                </div>
                {!selectedFile && <div className="btn-browse">Browse</div>}
                {selectedFile && (
                  <button onClick={handleFileRemove} className="btn-remove-file" title="Hapus File">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                )}
              </label>
            </div>
            <p style={{textAlign: 'center'}}>Atau</p>
          
            <div className="input-group">
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Masukkan URL dokumen..."
                className="text-input"
                disabled={isLoading}
              />
            </div>

            <div className="input-group" style={{marginTop: '30px'}}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ajukan pertanyaan spesifik untuk dokumen..."
                className="text-input"
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !query.trim() || (!selectedFile && link == "")} className="submit-button">
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                )}
              </button>
            </div>
          </form>

          <div className="response-container">
            {status && (
              <div className="status-badge">
                <span className="status-indicator"></span>
                {status}
              </div>
            )}
            
            {(answer || isLoading) && (
              <div className="answer-box">
                <div className="answer-text">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {displayAnswer.trim() + (isLoading ? ' ▍' : '')}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
