import React, { useState, useEffect } from 'react';
import styles from './BookShelf.module.css';

export interface Book {
  id: string;
  title: string;
  author?: string;
  filePath: string;
  fileType: 'pdf' | 'epub';
  lastOpened: Date;
  bookmarks: Bookmark[];
  progress: {
    currentPage: number;
    totalPages: number;
    percentage: number;
  };
  addedDate: Date;
}

export interface Bookmark {
  id: string;
  page: number;
  title: string;
  description?: string;
  createdAt: Date;
}

interface BookShelfProps {
  onBookSelect: (book: Book) => void;
  onBookRemove: (bookId: string) => void;
  onBookmarkAdd: (bookId: string, bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  onBookmarkRemove: (bookId: string, bookmarkId: string) => void;
  onProgressUpdate?: (bookId: string, progress: Book['progress']) => void;
  updateTrigger?: number;
}

export const BookShelf: React.FC<BookShelfProps> = ({
  onBookSelect,
  onBookRemove,
 // onBookmarkAdd,
  //onBookmarkRemove,
  //onProgressUpdate,
  updateTrigger
}) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showStorageInfo, setShowStorageInfo] = useState(false);

  useEffect(() => {
    loadBooks();
    
    // Add event listener for beforeunload to save progress
    const handleBeforeUnload = () => {
      saveBooks(books); // Save current state before closing
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Reload books when updateTrigger changes
  useEffect(() => {
    if (updateTrigger && updateTrigger > 0) {
      loadBooks();
    }
  }, [updateTrigger]);

  // Auto-save books whenever books state changes
  useEffect(() => {
    if (books.length > 0) {
      saveBooks(books);
    }
  }, [books]);

  const loadBooks = () => {
    try {
      const savedBooks = localStorage.getItem('bookshelf_books');
      if (savedBooks) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsedBooks = JSON.parse(savedBooks).map((book: any) => ({
          ...book,
          lastOpened: new Date(book.lastOpened),
          addedDate: new Date(book.addedDate),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          bookmarks: book.bookmarks.map((bm: any) => ({
            ...bm,
            createdAt: new Date(bm.createdAt)
          }))
        }));
        setBooks(parsedBooks);
      }
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  const saveBooks = (updatedBooks: Book[]) => {
    try {
      localStorage.setItem('bookshelf_books', JSON.stringify(updatedBooks));
      setBooks(updatedBooks);
    } catch (error) {
      console.error('Error saving books:', error);
    }
  };

  const exportBooksData = () => {
    try {
      const data = localStorage.getItem('bookshelf_books');
      if (data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bookshelf_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting books:', error);
    }
  };

  const importBooksData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedBooks = JSON.parse(e.target?.result as string);
          localStorage.setItem('bookshelf_books', JSON.stringify(importedBooks));
          loadBooks();
        } catch (error) {
          console.error('Error importing books:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const addBook = (book: Omit<Book, 'id' | 'lastOpened' | 'bookmarks' | 'progress' | 'addedDate'>) => {
    const newBook: Book = {
      ...book,
      id: Date.now().toString(),
      lastOpened: new Date(),
      bookmarks: [],
      progress: {
        currentPage: 1,
        totalPages: 1,
        percentage: 0
      },
      addedDate: new Date()
    };

    const updatedBooks = [newBook, ...books];
    saveBooks(updatedBooks);
    setShowAddBook(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const updateBookProgress = (bookId: string, progress: Book['progress']) => {
  //   const updatedBooks = books.map(book => 
  //     book.id === bookId 
  //       ? { ...book, progress, lastOpened: new Date() }
  //       : book
  //   );
  //   saveBooks(updatedBooks);
    
  //   // Notify parent component about progress update
  //   onProgressUpdate?.(bookId, progress);
  // };

  const addBookmark = (bookId: string, bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: Date.now().toString(),
      createdAt: new Date()
    };

    const updatedBooks = books.map(book =>
      book.id === bookId
        ? { ...book, bookmarks: [...book.bookmarks, newBookmark] }
        : book
    );
    saveBooks(updatedBooks);
  };

  const removeBookmark = (bookId: string, bookmarkId: string) => {
    const updatedBooks = books.map(book =>
      book.id === bookId
        ? { ...book, bookmarks: book.bookmarks.filter(bm => bm.id !== bookmarkId) }
        : book
    );
    saveBooks(updatedBooks);
  };

  const removeBook = (bookId: string) => {
    const updatedBooks = books.filter(book => book.id !== bookId);
    saveBooks(updatedBooks);
    onBookRemove(bookId);
  };

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    onBookSelect(book);
  };

  const handleBookmarkClick = (book: Book) => {
    setSelectedBook(book);
    setShowBookmarks(true);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getFileIcon = (fileType: string) => {
    return fileType === 'pdf' ? '📄' : '📚';
  };

  const getStorageInfo = () => {
    const data = localStorage.getItem('bookshelf_books');
    if (data) {
      const size = new Blob([data]).size;
      return {
        booksCount: books.length,
        dataSize: `${(size / 1024).toFixed(2)} KB`,
        storageLocation: 'Browser Local Storage',
        lastUpdated: new Date().toLocaleString()
      };
    }
    return null;
  };

  return (
    <div className={styles.bookShelf}>
      {/* Header */}
      <div className={styles.header}>
        <h2>📚 My Bookshelf</h2>
        <div className={styles.headerActions}>
          <button 
            onClick={() => setShowStorageInfo(true)}
            className={styles.infoButton}
            title="Storage Info"
          >
            ℹ️
          </button>
          <button 
            onClick={() => setShowAddBook(true)}
            className={styles.addButton}
          >
            + Add Book
          </button>
        </div>
      </div>

      {/* Storage Info Modal */}
      {showStorageInfo && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>📁 Storage Information</h3>
            <div className={styles.storageInfo}>
              {getStorageInfo() ? (
                <>
                  <div className={styles.infoRow}>
                    <strong>Storage Location:</strong>
                    <span>Browser Local Storage</span>
                  </div>
                  <div className={styles.infoRow}>
                    <strong>Books Count:</strong>
                    <span>{getStorageInfo()?.booksCount}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <strong>Data Size:</strong>
                    <span>{getStorageInfo()?.dataSize}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <strong>Last Updated:</strong>
                    <span>{getStorageInfo()?.lastUpdated}</span>
                  </div>
                  <div className={styles.storageNote}>
                    <p><strong>Note:</strong> Books are stored as file paths, not the actual files. 
                    Original files remain in their original locations.</p>
                  </div>
                </>
              ) : (
                <p>No books stored yet.</p>
              )}
            </div>
            
            <div className={styles.storageActions}>
              <label className={styles.importButton}>
                📥 Import Backup
                <input
                  type="file"
                  accept=".json"
                  onChange={importBooksData}
                  style={{ display: 'none' }}
                />
              </label>
              <button 
                onClick={exportBooksData}
                className={styles.exportButton}
              >
                📤 Export Backup
              </button>
            </div>
            
            <div className={styles.modalActions}>
              <button onClick={() => setShowStorageInfo(false)} className={styles.closeButton}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book List */}
      <div className={styles.bookList}>
        {books.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📚</div>
            <h3>Your bookshelf is empty</h3>
            <p>Add your first book to get started!</p>
            <button 
              onClick={() => setShowAddBook(true)}
              className={styles.addFirstButton}
            >
              Add Your First Book
            </button>
          </div>
        ) : (
          books.map(book => (
            <div key={book.id} className={styles.bookCard}>
              <div className={styles.bookInfo}>
                <div className={styles.bookIcon}>
                  {getFileIcon(book.fileType)}
                </div>
                <div className={styles.bookDetails}>
                  <h3>{book.title}</h3>
                  {book.author && <p className={styles.author}>{book.author}</p>}
                  <p className={styles.filePath}>📁 {book.filePath}</p>
                  <p className={styles.lastOpened}>
                    Last opened: {formatDate(book.lastOpened)}
                  </p>
                  <div className={styles.progress}>
                    <div 
                      className={styles.progressBar}
                      style={{ width: `${book.progress.percentage}%` }}
                    />
                    <span>Page {book.progress.currentPage} of {book.progress.totalPages}</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.bookActions}>
                <button 
                  onClick={() => handleBookSelect(book)}
                  className={styles.openButton}
                >
                  Open
                </button>
                <button 
                  onClick={() => handleBookmarkClick(book)}
                  className={styles.bookmarksButton}
                  title={`${book.bookmarks.length} bookmarks`}
                >
                  📖 ({book.bookmarks.length})
                </button>
                <button 
                  onClick={() => removeBook(book.id)}
                  className={styles.removeButton}
                  title="Remove book"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Book Modal */}
      {showAddBook && (
        <AddBookModal 
          onAdd={addBook}
          onClose={() => setShowAddBook(false)}
        />
      )}

      {/* Bookmarks Modal */}
      {showBookmarks && selectedBook && (
        <BookmarksModal
          book={selectedBook}
          onAddBookmark={addBookmark}
          onRemoveBookmark={removeBookmark}
          onClose={() => setShowBookmarks(false)}
        />
      )}
    </div>
  );
};

// Add Book Modal Component
interface AddBookModalProps {
  onAdd: (book: Omit<Book, 'id' | 'lastOpened' | 'bookmarks' | 'progress' | 'addedDate'>) => void;
  onClose: () => void;
}

const AddBookModal: React.FC<AddBookModalProps> = ({ onAdd, onClose }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [filePath, setFilePath] = useState('');
  const [fileType, setFileType] = useState<'pdf' | 'epub'>('pdf');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && filePath) {
      onAdd({
        title,
        author: author || undefined,
        filePath,
        fileType
      });
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>Add New Book</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter book title"
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Author</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Enter author name"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>File Path *</label>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="Enter file path"
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>File Type *</label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as 'pdf' | 'epub')}
            >
              <option value="pdf">PDF</option>
              <option value="epub">EPUB</option>
            </select>
          </div>
          
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton}>
              Add Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Bookmarks Modal Component
interface BookmarksModalProps {
  book: Book;
  onAddBookmark: (bookId: string, bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  onRemoveBookmark: (bookId: string, bookmarkId: string) => void;
  onClose: () => void;
}

const BookmarksModal: React.FC<BookmarksModalProps> = ({
  book,
  onAddBookmark,
  onRemoveBookmark,
  onClose
}) => {
  const [showAddBookmark, setShowAddBookmark] = useState(false);
  const [page, setPage] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleAddBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (page && title) {
      onAddBookmark(book.id, {
        page: parseInt(page),
        title,
        description: description || undefined
      });
      setPage('');
      setTitle('');
      setDescription('');
      setShowAddBookmark(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>Bookmarks - {book.title}</h3>
        
        <div className={styles.bookmarksList}>
          {book.bookmarks.length === 0 ? (
            <p className={styles.noBookmarks}>No bookmarks yet</p>
          ) : (
            book.bookmarks.map(bookmark => (
              <div key={bookmark.id} className={styles.bookmarkItem}>
                <div className={styles.bookmarkInfo}>
                  <h4>{bookmark.title}</h4>
                  <p>Page {bookmark.page}</p>
                  {bookmark.description && <p>{bookmark.description}</p>}
                  <small>{formatDate(bookmark.createdAt)}</small>
                </div>
                <button
                  onClick={() => onRemoveBookmark(book.id, bookmark.id)}
                  className={styles.removeBookmarkButton}
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className={styles.modalActions}>
          <button 
            onClick={() => setShowAddBookmark(true)}
            className={styles.addBookmarkButton}
          >
            + Add Bookmark
          </button>
          <button onClick={onClose} className={styles.closeButton}>
            Close
          </button>
        </div>

        {showAddBookmark && (
          <div className={styles.addBookmarkForm}>
            <h4>Add New Bookmark</h4>
            <form onSubmit={handleAddBookmark}>
              <div className={styles.formGroup}>
                <label>Page Number *</label>
                <input
                  type="number"
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  min="1"
                  max={book.progress.totalPages}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Bookmark title"
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowAddBookmark(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.saveButton}>
                  Add Bookmark
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}; 