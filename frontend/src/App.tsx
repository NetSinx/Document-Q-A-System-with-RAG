import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BotMessageSquare, FileText, Moon, Send, Square, Sun, Trash2 } from 'lucide-react';
import './App.css'

function App() {
  const [query, setQuery] = useState('');
  const [link, setLink] = useState('');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
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

  const handleFileRemove = (e: any) => {
    e.preventDefault();
    setSelectedFile(null);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth"
      });
    }, 100);

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

    abortControllerRef.current = new AbortController();

    const formData = new FormData();
    formData.append('query', query.trim());
    if (selectedFile) {
      formData.append('file', selectedFile); 
    }
    formData.append('link', link);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
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

            if (parsedData.error) {
              if (String(parsedData.error).includes("Name or service not known")) {
                setStatus("Error!");
                setAnswer("URL yang dimasukkan tidak valid.");
              } else if (String(parsedData.error).includes("429")) {
                setStatus("Error!");
                setAnswer("Rate limit reached. Please try again later.");
              } else {
                setStatus(parsedData.status || "Error!");
                setAnswer(parsedData.error);
              }
            } else {
              if (parsedData.status) {
                setStatus(parsedData.status);
              }
              if (parsedData.message) {
                setAnswer((prev) => prev + parsedData.message);
                setStatus('');
              }
            }
          } catch (err) {
            setStatus("Error!")
            setAnswer('Terjadi kesalahan pada server.');
            console.error('Gagal parse baris JSON:', err);
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setStatus('Permintaan dibatalkan.');
      } else {
        console.error('Error:', error);
        setStatus("Terjadi masalah pada server...")
        setAnswer('Terjadi kesalahan pada server.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const abortControllerRef = useRef<AbortController | null>(null);
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  };

  const answerBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (answer || isLoading) {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "auto"
      });
    }
  }, [answer, isLoading]);

  let displayAnswer = answer;
  displayAnswer = displayAnswer.replace(/<think>[\s\S]*?<\/think>/gi, '');
  displayAnswer = displayAnswer.replace(/<think>[\s\S]*$/gi, '');

  return (
    <div className="page-layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <BotMessageSquare size={30} />
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
              <Sun />
            ) : (
              <Moon />
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
                  <FileText />
                </div>
                <div className="file-info">
                  <span className="file-name">{selectedFile ? selectedFile.name : 'Pilih Dokumen'}</span>
                  <span className="file-desc">{selectedFile ? 'Siap untuk analisis' : 'PDF, TXT, atau DOCX hingga 10MB'}</span>
                </div>
                {!selectedFile && <div className="btn-browse">Browse</div>}
                {selectedFile && (
                  <button type='button' onClick={handleFileRemove} className="btn-remove-file" title="Hapus File">
                    <Trash2 />
                  </button>
                )}
              </label>
            </div>
            <p style={{textAlign: 'center'}}>Atau</p>
          
            <div className="input-group">
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Masukkan URL dokumen..."
                className="text-input"
                disabled={isLoading}
              />
            </div>
            <p className='note-input-url'>Note: Jika URL yang dimasukkan lebih dari satu gunakan tanda koma (,). (Contoh: https://example.com/, https://example.co.id/)</p>

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
                  <Send />
                )}
              </button>
              {isLoading && (
                <button type="button" onClick={handleStop} className="stop-button" title="Berhenti">
                  <Square />
                </button>
              )}
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
              <div className="answer-box" ref={answerBox}>
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
