import React, { useState, useEffect } from 'react';
import { EpubReader } from './EpubReader';
import { PdfReader } from './PdfReader';
import styles from './BookReader.module.css';

interface BookReaderProps {
  filePath: string;
  fileType: 'epub' | 'pdf';
  onError: (message: string) => void;
  onClose: () => void;
  onProgressUpdate?: (progress: { currentPage: number; totalPages: number; percentage: number }) => void;
  onBookmarkAdd?: (bookmark: { page: number; title: string; description?: string }) => void;
}

export const BookReader: React.FC<BookReaderProps> = ({ 
  filePath, 
  fileType, 
  onError, 
  onClose,
  onProgressUpdate,
  onBookmarkAdd
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fileContent, setFileContent] = useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkDescription, setBookmarkDescription] = useState('');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // New state for reader settings
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [fontSize, setFontSize] = useState(16);
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [showSettings, setShowSettings] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isNavigationVisible, setIsNavigationVisible] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  // Use a listener to keep track of fullscreen state
  useEffect(() => {
    // onWindowStateChanged uses a callback, which is better for state syncing
    const handleWindowStateChange = (isFull: boolean) => {
      setIsFullscreen(isFull);
    };
    window.electronAPI.onWindowStateChanged(handleWindowStateChange);
    
    return () => {
      window.electronAPI.removeAllListeners('window:stateChanged');
    };
  }, []);

  // Effect to load the file content from the main process
  useEffect(() => {
    const loadFileContent = async () => {
      setIsLoading(true);
      try {
        if (!filePath) {
          throw new Error('File path is missing.');
        }
        // --- THIS IS THE KEY CHANGE ---
        // Call the IPC handler to get the file's binary content
        const content = await window.electronAPI.readFileContent(filePath);
        setFileContent(content);
      } catch (error) {
        console.error('Failed to load file content:', error);
        onError(`Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFileContent();
  }, [filePath, onError]);

  // Auto-save progress when page changes
  useEffect(() => {
    if (onProgressUpdate && totalPages > 0 && autoSaveEnabled) {
      const percentage = Math.round((currentPage / totalPages) * 100);
      const progress = {
        currentPage,
        totalPages,
        percentage
      };
      
      // Update progress immediately
      onProgressUpdate(progress);
      
      // Also save to localStorage for persistence
      saveProgressToStorage(progress);
    }
  }, [currentPage, totalPages, onProgressUpdate, autoSaveEnabled]);

  // Handle scroll for navigation visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollDelta = scrollTop - lastScrollTop;
      
      if (scrollDelta > 10 && scrollTop > 100) {
        // Scrolling down - hide navigation
        setIsNavigationVisible(false);
      } else if (scrollDelta < -10) {
        // Scrolling up - show navigation
        setIsNavigationVisible(true);
      }
      
      setLastScrollTop(scrollTop);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollTop]);

  // Save progress before component unmounts
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (totalPages > 0) {
        const percentage = Math.round((currentPage / totalPages) * 100);
        const progress = {
          currentPage,
          totalPages,
          percentage
        };
        saveProgressToStorage(progress);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save progress on unmount
      if (totalPages > 0) {
        const percentage = Math.round((currentPage / totalPages) * 100);
        const progress = {
          currentPage,
          totalPages,
          percentage
        };
        saveProgressToStorage(progress);
      }
    };
  }, [currentPage, totalPages]);

  const saveProgressToStorage = (progress: { currentPage: number; totalPages: number; percentage: number }) => {
    try {
      const savedBooks = localStorage.getItem('bookshelf_books');
      if (savedBooks) {
        const books = JSON.parse(savedBooks);
        const updatedBooks = books.map((book: any) => {
          if (book.filePath === filePath) {
            return {
              ...book,
              progress,
              lastOpened: new Date().toISOString()
            };
          }
          return book;
        });
        localStorage.setItem('bookshelf_books', JSON.stringify(updatedBooks));
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleToggleFullscreen = async () => {
    try {
      await window.electronAPI.toggleFullscreen();
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleTotalPagesChange = (total: number) => {
    setTotalPages(total);
  };

  const handleAddBookmark = () => {
    if (bookmarkTitle.trim()) {
      const bookmark = {
        page: currentPage,
        title: bookmarkTitle.trim(),
        description: bookmarkDescription.trim() || undefined
      };
      
      // Add bookmark to localStorage
      addBookmarkToStorage(bookmark);
      
      // Notify parent component
      onBookmarkAdd?.(bookmark);
      
      // Reset form
      setBookmarkTitle('');
      setBookmarkDescription('');
      setShowBookmarkModal(false);
    }
  };

  const addBookmarkToStorage = (bookmark: { page: number; title: string; description?: string }) => {
    try {
      const savedBooks = localStorage.getItem('bookshelf_books');
      if (savedBooks) {
        const books = JSON.parse(savedBooks);
        const updatedBooks = books.map((book: any) => {
          if (book.filePath === filePath) {
            const newBookmark = {
              id: Date.now().toString(),
              ...bookmark,
              createdAt: new Date().toISOString()
            };
            return {
              ...book,
              bookmarks: [...(book.bookmarks || []), newBookmark]
            };
          }
          return book;
        });
        localStorage.setItem('bookshelf_books', JSON.stringify(updatedBooks));
      }
    } catch (error) {
      console.error('Error saving bookmark:', error);
    }
  };

  const getFileName = (path: string) => {
    return path.split(/[\\/]/).pop() || 'Unknown File';
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p>Preparing book...</p>
        </div>
      </div>
    );
  }

  if (!fileContent) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h3>Error Loading Book</h3>
          <p>The book file could not be read. Please try a different file.</p>
          <button onClick={onClose} className={styles.navButton}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.bookReader}>
      <div className={styles.header}>
        <div className={styles.bookInfo}>
          <h2>{getFileName(filePath)}</h2>
          <span className={styles.fileType}>{fileType.toUpperCase()}</span>
          <span className={styles.progressInfo}>
            Page {currentPage} of {totalPages} ({Math.round((currentPage / totalPages) * 100)}%)
          </span>
        </div>
        
        <div className={styles.headerActions}>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={styles.settingsButton}
            title="Reader Settings"
          >
            ⚙️
          </button>
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className={styles.themeButton}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Theme`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button 
            onClick={() => setShowBookmarkModal(true)}
            className={styles.bookmarkButton}
            title="Add Bookmark with Notes"
          >
            📖
          </button>
          <button 
            onClick={handleToggleFullscreen}
            className={styles.fullscreenButton}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? "⤓" : "⤢"}
          </button>
          <button 
            onClick={onClose}
            className={styles.closeButton}
            title="Close Book"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Settings Panel - Sidebar */}
      {showSettings && (
        <div className={styles.settingsSidebar}>
          <div className={styles.settingsContent}>
            <div className={styles.settingsHeader}>
              <h3>Reader Settings</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className={styles.closeSettingsButton}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.settingGroup}>
              <label>Font Size: {fontSize}px</label>
              <input
                type="range"
                min="12"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className={styles.rangeSlider}
              />
            </div>
            
            <div className={styles.settingGroup}>
              <label>Line Spacing: {lineSpacing}</label>
              <input
                type="range"
                min="1.2"
                max="2.5"
                step="0.1"
                value={lineSpacing}
                onChange={(e) => setLineSpacing(Number(e.target.value))}
                className={styles.rangeSlider}
              />
            </div>
            
            <div className={styles.settingGroup}>
              <label>Zoom: {zoomLevel}%</label>
              <input
                type="range"
                min="50"
                max="200"
                step="10"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(Number(e.target.value))}
                className={styles.rangeSlider}
              />
            </div>
            
            <div className={styles.settingGroup}>
              <label>Theme</label>
              <div className={styles.themeOptions}>
                <button
                  className={`${styles.themeOption} ${theme === 'light' ? styles.active : ''}`}
                  onClick={() => setTheme('light')}
                >
                  ☀️ Light
                </button>
                <button
                  className={`${styles.themeOption} ${theme === 'dark' ? styles.active : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  🌙 Dark
                </button>
              </div>
            </div>
            
            <div className={styles.settingGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                />
                Auto-save progress
              </label>
            </div>
          </div>
        </div>
      )}

      <div className={`${styles.content} ${theme === 'dark' ? styles.darkTheme : ''} ${showSettings ? styles.contentWithSidebar : ''}`}>
        {fileType === 'epub' ? (
          <EpubReader 
            fileContent={fileContent} 
            onError={onError}
            onPageChange={handlePageChange}
            onTotalPagesChange={handleTotalPagesChange}
            fontSize={fontSize}
            lineSpacing={lineSpacing}
            zoomLevel={zoomLevel}
            theme={theme}
            isNavigationVisible={isNavigationVisible}
          />
        ) : (
          <PdfReader 
            fileContent={fileContent} 
            onError={onError}
            onPageChange={handlePageChange}
            onTotalPagesChange={handleTotalPagesChange}
            fontSize={fontSize}
            lineSpacing={lineSpacing}
            zoomLevel={zoomLevel}
            theme={theme}
            isNavigationVisible={isNavigationVisible}
          />
        )}
      </div>

      {/* Enhanced Bookmark Modal */}
      {showBookmarkModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>📖 Add Bookmark with Notes</h3>
            <div className={styles.bookmarkInfo}>
              <p><strong>Current Page:</strong> {currentPage} of {totalPages}</p>
              <p><strong>Progress:</strong> {Math.round((currentPage / totalPages) * 100)}%</p>
            </div>
            
            <div className={styles.formGroup}>
              <label>Bookmark Title *</label>
              <input
                type="text"
                value={bookmarkTitle}
                onChange={(e) => setBookmarkTitle(e.target.value)}
                placeholder="e.g., Important chapter, Key concept, etc."
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Notes & Description</label>
              <textarea
                value={bookmarkDescription}
                onChange={(e) => setBookmarkDescription(e.target.value)}
                placeholder="Add your notes, thoughts, or description about this page..."
                rows={4}
              />
            </div>
            
            <div className={styles.modalActions}>
              <button 
                onClick={() => setShowBookmarkModal(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                onClick={handleAddBookmark}
                className={styles.saveButton}
                disabled={!bookmarkTitle.trim()}
              >
                Save Bookmark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 