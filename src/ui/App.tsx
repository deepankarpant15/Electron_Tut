import { useEffect, useState } from 'react'
import { FileImport } from './components/FileImport'
import { BookReader } from './components/BookReader'
import { BookShelf } from './components/BookShelf'
import type { Book } from './components/BookShelf'
import './App.module.css'

interface BookState {
  filePath: string;
  fileType: 'epub' | 'pdf';
}

type ViewMode = 'bookshelf' | 'reader' | 'import';

function App() {
  const [appVersion, setAppVersion] = useState<string>('')
  const [platform, setPlatform] = useState<string>('')
  const [isDev, setIsDev] = useState<boolean>(false)
  const [currentBook, setCurrentBook] = useState<BookState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('bookshelf')
  const [bookshelfUpdateTrigger, setBookshelfUpdateTrigger] = useState(0)

  useEffect(() => {
    // Get app information
    const getAppInfo = async () => {
      try {
        const version = await window.electronAPI.getAppVersion()
        const platformInfo = await window.electronAPI.getPlatform()
        const devMode = await window.electronAPI.isDev()
        
        setAppVersion(version)
        setPlatform(platformInfo)
        setIsDev(devMode)
      } catch (error) {
        console.error('Failed to get app info:', error)
      }
    }

    getAppInfo()

    // Set up event listeners
    window.electronAPI.onFileOpened((filePath) => {
      const fileExtension = filePath.toLowerCase().split('.').pop()
      if (fileExtension === 'epub' || fileExtension === 'pdf') {
        setCurrentBook({
          filePath,
          fileType: fileExtension as 'epub' | 'pdf'
        })
        setViewMode('reader')
      }
    })

    window.electronAPI.onWindowStateChanged((isFullscreen) => {
      console.log('Window fullscreen state:', isFullscreen)
    })

    // Cleanup listeners on unmount
    return () => {
      window.electronAPI.removeAllListeners('file:opened')
      window.electronAPI.removeAllListeners('window:stateChanged')
    }
  }, [])

  const handleFileSelected = (filePath: string, fileType: 'epub' | 'pdf') => {
    // Add book to bookshelf first
    addBookToBookshelf(filePath, fileType);
    
    // Then open it in reader
    setCurrentBook({ filePath, fileType })
    setError(null)
    setViewMode('reader')
  }

  const addBookToBookshelf = (filePath: string, fileType: 'epub' | 'pdf') => {
    try {
      // Get current books from localStorage
      const savedBooks = localStorage.getItem('bookshelf_books');
      const books = savedBooks ? JSON.parse(savedBooks) : [];
      
      // Check if book already exists
      const existingBook = books.find((book: any) => book.filePath === filePath);
      if (existingBook) {
        console.log('Book already exists in bookshelf');
        return;
      }
      
      // Create new book entry
      const fileName = filePath.split(/[\\/]/).pop() || 'Unknown Book';
      const newBook = {
        id: Date.now().toString(),
        title: fileName.replace(/\.(pdf|epub)$/i, ''),
        author: undefined,
        filePath: filePath,
        fileType: fileType,
        lastOpened: new Date().toISOString(),
        bookmarks: [],
        progress: {
          currentPage: 1,
          totalPages: 1,
          percentage: 0
        },
        addedDate: new Date().toISOString()
      };
      
      // Add to bookshelf
      const updatedBooks = [newBook, ...books];
      localStorage.setItem('bookshelf_books', JSON.stringify(updatedBooks));
      
      // Trigger bookshelf refresh
      setBookshelfUpdateTrigger(prev => prev + 1);
      
      console.log('Book added to bookshelf:', newBook.title);
    } catch (error) {
      console.error('Error adding book to bookshelf:', error);
    }
  }

  const handleError = (message: string) => {
    setError(message)
    console.error('App error:', message)
  }

  const handleCloseBook = () => {
    setCurrentBook(null)
    setError(null)
    setViewMode('bookshelf')
  }

  const handleBookSelect = (book: Book) => {
    setCurrentBook({
      filePath: book.filePath,
      fileType: book.fileType
    })
    setViewMode('reader')
  }

  const handleBookRemove = (bookId: string) => {
    // Book removal is handled by BookShelf component
    console.log('Book removed:', bookId)
  }

  const handleBookmarkAdd = (bookId: string, bookmark: any) => {
    // Bookmark addition is handled by BookShelf component
    console.log('Bookmark added:', { bookId, bookmark })
  }

  const handleBookmarkRemove = (bookId: string, bookmarkId: string) => {
    // Bookmark removal is handled by BookShelf component
    console.log('Bookmark removed:', { bookId, bookmarkId })
  }

  const handleProgressUpdate = (progress: { currentPage: number; totalPages: number; percentage: number }) => {
    // Update book progress in bookshelf
    console.log('Progress updated:', progress)
  }

  const handleBookProgressUpdate = (bookId: string, progress: { currentPage: number; totalPages: number; percentage: number }) => {
    // This function will be called by BookShelf when progress is updated
    console.log('Book progress updated:', { bookId, progress })
  }

  const handleBookmarkAddFromReader = (bookmark: { page: number; title: string; description?: string }) => {
    // Add bookmark from reader
    console.log('Bookmark added from reader:', bookmark)
  }

  // If a book is open, show the reader
  if (viewMode === 'reader' && currentBook) {
    return (
      <BookReader
        filePath={currentBook.filePath}
        fileType={currentBook.fileType}
        onError={handleError}
        onClose={handleCloseBook}
        onProgressUpdate={handleProgressUpdate}
        onBookmarkAdd={handleBookmarkAddFromReader}
      />
    )
  }

  // Show bookshelf view
  if (viewMode === 'bookshelf') {
    return (
      <div className="app" style={{
        minHeight: '100vh',
        background: 'linear-gradient(120deg, #e0c3fc 0%, #f8fafc 100%)',
        fontFamily: '"Merriweather", "Georgia", serif',
        color: '#3d2c53'
      }}>
        <header className="app-header" style={{background: 'transparent', boxShadow: 'none', borderBottom: 'none', paddingTop: '3rem'}}>
          <h1 style={{
            margin: 0,
            fontWeight: 700,
            fontSize: '3.2rem',
            textAlign: 'center',
            color: '#6c3483',
            fontFamily: '"Merriweather", "Georgia", serif',
            letterSpacing: '2px',
            textShadow: '0 2px 16px #e0c3fc'
          }}>
            ReadEase <span style={{color: '#764ba2', fontFamily: 'inherit'}}>– Book Reader</span>
          </h1>
          <div className="app-info" style={{display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem', fontSize: '1.2rem', fontFamily: '"Montserrat", "Segoe UI", sans-serif', color: '#764ba2'}}>
            <span>Version: <b>{appVersion}</b></span>
            <span>Platform: <b>{platform}</b></span>
            <span>Dev Mode: <b style={{color: isDev ? '#27ae60' : '#e74c3c'}}>{isDev ? 'Yes' : 'No'}</b></span>
          </div>
        </header>

        <main className="app-main" style={{maxWidth: '1100px', margin: '0 auto', width: '100%', padding: '0 0 3rem 0'}}>
          {error && (
            <div className="error-message" style={{background: '#fdecea', color: '#c0392b', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(231,76,60,0.08)'}}>
              <p style={{margin: 0}}>{error}</p>
              <button onClick={() => setError(null)} className="btn btn-secondary" style={{marginTop: '0.5rem', background: '#c0392b', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer'}}>Dismiss</button>
            </div>
          )}

          <div className="content-area" style={{marginTop: '2rem'}}>
            <div className="navigation-bar" style={{display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center'}}>
              <button 
                onClick={() => setViewMode('bookshelf')}
                className="nav-button active"
                style={{background: '#764ba2', color: 'white', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', fontWeight: 700, fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(118,75,162,0.08)', outline: 'none', fontFamily: '"Montserrat", "Segoe UI", sans-serif'}}
              >
                📚 Bookshelf
              </button>
              <button 
                onClick={() => setViewMode('import')}
                className="nav-button"
                style={{background: '#f7cac9', color: '#764ba2', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', fontWeight: 700, fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(247,202,201,0.08)', outline: 'none', fontFamily: '"Montserrat", "Segoe UI", sans-serif'}}
              >
                📁 Import Book
              </button>
            </div>

            {/* Bookshelf Section with Card Effect */}
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '18px',
              boxShadow: '0 8px 32px rgba(118,75,162,0.10)',
              padding: '2.5rem 2rem',
              margin: '0 auto',
              maxWidth: '1050px',
              minHeight: '400px',
              marginBottom: '2rem',
              position: 'relative',
              zIndex: 1
            }}>
              <BookShelf
                onBookSelect={handleBookSelect}
                onBookRemove={handleBookRemove}
                onBookmarkAdd={handleBookmarkAdd}
                onBookmarkRemove={handleBookmarkRemove}
                onProgressUpdate={handleBookProgressUpdate}
                updateTrigger={bookshelfUpdateTrigger}
              />
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Show import view
  if (viewMode === 'import') {
    return (
      <div className="app" style={{
        minHeight: '100vh',
        background: 'linear-gradient(120deg, #f8fafc 0%, #e0c3fc 100%)',
        fontFamily: '"Merriweather", "Georgia", serif',
        color: '#3d2c53',
        paddingBottom: '2rem'
      }}>
        <header className="app-header" style={{background: 'transparent', boxShadow: 'none', borderBottom: 'none', paddingTop: '3rem'}}>
          <h1 style={{
            margin: 0,
            fontWeight: 700,
            fontSize: '2.8rem',
            textAlign: 'center',
            color: '#6c3483',
            fontFamily: '"Merriweather", "Georgia", serif',
            letterSpacing: '1px',
            textShadow: '0 2px 8px #e0c3fc'
          }}>
            ReadEase <span style={{color: '#764ba2', fontFamily: 'inherit'}}>– Book Reader</span>
          </h1>
          <div className="app-info" style={{display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem', fontSize: '1.1rem', fontFamily: '"Montserrat", "Segoe UI", sans-serif', color: '#764ba2'}}>
            <span>Version: <b>{appVersion}</b></span>
            <span>Platform: <b>{platform}</b></span>
            <span>Dev Mode: <b style={{color: isDev ? '#27ae60' : '#e74c3c'}}>{isDev ? 'Yes' : 'No'}</b></span>
          </div>
        </header>

        <main className="app-main" style={{maxWidth: '600px', margin: '0 auto', width: '100%'}}>
          {error && (
            <div className="error-message" style={{background: '#fdecea', color: '#c0392b', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(231,76,60,0.08)'}}>
              <p style={{margin: 0}}>{error}</p>
              <button onClick={() => setError(null)} className="btn btn-secondary" style={{marginTop: '0.5rem', background: '#c0392b', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer'}}>Dismiss</button>
            </div>
          )}

          <div className="content-area" style={{marginTop: '2rem'}}>
            <div className="navigation-bar" style={{display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center'}}>
              <button 
                onClick={() => setViewMode('bookshelf')}
                className="nav-button"
                style={{background: '#764ba2', color: 'white', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', fontWeight: 700, fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(118,75,162,0.08)', outline: 'none', fontFamily: '"Montserrat", "Segoe UI", sans-serif'}}
              >
                📚 Bookshelf
              </button>
              <button 
                onClick={() => setViewMode('import')}
                className="nav-button active"
                style={{background: '#f7cac9', color: '#764ba2', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', fontWeight: 700, fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(247,202,201,0.08)', outline: 'none', fontFamily: '"Montserrat", "Segoe UI", sans-serif'}}
              >
                📁 Import Book
              </button>
            </div>

            <div className="welcome" style={{background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '2rem', marginBottom: '2rem', textAlign: 'center'}}>
              <h2 style={{fontWeight: 700, color: '#764ba2', marginBottom: '0.5rem', fontFamily: '"Merriweather", "Georgia", serif'}}>Import New Book</h2>
              <p style={{marginBottom: '0.5rem', fontFamily: '"Montserrat", "Segoe UI", sans-serif'}}>Add a new book to your personal library.</p>
              <p style={{color: '#667eea', fontWeight: 500, fontFamily: '"Montserrat", "Segoe UI", sans-serif'}}>Supported formats: EPUB and PDF files.</p>
            </div>

            <FileImport 
              onFileSelected={handleFileSelected}
              onError={handleError}
            />
          </div>
        </main>
      </div>
    )
  }

  return null
}

export default App
