import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import styles from './PdfReader.module.css';

interface PdfReaderProps {
  fileContent: ArrayBuffer;
  onError: (message: string) => void;
  onPageChange?: (page: number) => void;
  onTotalPagesChange?: (total: number) => void;
  fontSize?: number;
  lineSpacing?: number;
  zoomLevel?: number;
  theme?: 'light' | 'dark';
  isNavigationVisible?: boolean;
}

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

export const PdfReader: React.FC<PdfReaderProps> = ({ 
  fileContent, 
  onError, 
  onPageChange, 
  onTotalPagesChange,
  fontSize = 16,
  lineSpacing = 1.5,
  zoomLevel = 100,
  theme = 'light',
  isNavigationVisible = true
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import pdfjs-dist
        const pdfjs = await import('pdfjs-dist');
        
        // Set worker path
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-workers/pdf.worker.min.mjs';

        if (!mounted) return;

        // Load the PDF document
        let pdfDocument: pdfjsLib.PDFDocumentProxy;
        try {
          const loadingTask = pdfjs.getDocument({ data: fileContent });
          pdfDocument = await loadingTask.promise;
        } catch (err) {
          console.error('Failed to load PDF document:', err);
          throw new Error('Failed to load PDF document. Please check if the file is valid.');
        }
        
        if (!mounted) return;

        setPdfDoc(pdfDocument);
        setTotalPages(pdfDocument.numPages);
        setCurrentPage(1);
        onTotalPagesChange?.(pdfDocument.numPages);

        // Render first page
        await renderPage(pdfDocument, 1);

      } catch (err) {
        console.error('PDF loading error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load PDF file';
        setError(errorMessage);
        onError(errorMessage);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    if (fileContent) {
      loadPdf();
    }
    
    return () => {
      mounted = false;
    };
  }, [fileContent, onError]);

  const renderPage = async (doc: pdfjsLib.PDFDocumentProxy, pageNumber: number) => {
    try {
      const page = await doc.getPage(pageNumber);
      
      // Get text content from the page
      const textContent = await page.getTextContent();
      
      // Convert text content to HTML with proper reading order
      const htmlContent = convertTextContentToHtml(textContent, page);
      
      setPageContent(htmlContent);
    } catch (err) {
      console.error('Page rendering error:', err);
      onError('Failed to render page');
    }
  };

  const convertTextContentToHtml = (textContent: any, page: pdfjsLib.PDFPageProxy): string => {
    const items = textContent.items as TextItem[];
    let html = '<div class="pdf-page">';
    
    // Sort items by reading order (top to bottom, left to right)
    const sortedItems = items.sort((a, b) => {
      const yA = page.view[3] - a.transform[5];
      const yB = page.view[3] - b.transform[5];
      
      // If y positions are close (same line), sort by x position
      if (Math.abs(yA - yB) < 10) {
        return a.transform[4] - b.transform[4]; // Left to right
      }
      
      // Otherwise sort by y position (top to bottom)
      return yB - yA;
    });
    
    let currentY = -1;
    let currentLine = '';
    
    for (const item of sortedItems) {
      const y = page.view[3] - item.transform[5];
      
      // Check if this is a new line (different y position)
      if (Math.abs(y - currentY) > 10) {
        if (currentLine.trim()) {
          html += `<div class="pdf-line">${currentLine}</div>`;
        }
        currentLine = '';
        currentY = y;
      }
      
      // Add text item
      const text = item.str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      currentLine += `<span class="pdf-text">${text}</span>`;
    }
    
    // Add the last line
    if (currentLine.trim()) {
      html += `<div class="pdf-line">${currentLine}</div>`;
    }
    
    html += '</div>';
    return html;
  };

  const nextPage = () => {
    if (pdfDoc && currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
      
      // Add page flip animation
      const contentElement = contentRef.current;
      if (contentElement) {
        contentElement.classList.add(styles.pageFlip);
        setTimeout(() => {
          contentElement.classList.remove(styles.pageFlip);
        }, 600);
      }
      
      renderPage(pdfDoc, newPage);
    }
  };

  const prevPage = () => {
    if (pdfDoc && currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage);
      
      // Add page flip animation
      const contentElement = contentRef.current;
      if (contentElement) {
        contentElement.classList.add(styles.pageFlip);
        setTimeout(() => {
          contentElement.classList.remove(styles.pageFlip);
        }, 600);
      }
      
      renderPage(pdfDoc, newPage);
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pdfDoc && pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      onPageChange?.(pageNumber);
      
      // Add page flip animation
      const contentElement = contentRef.current;
      if (contentElement) {
        contentElement.classList.add(styles.pageFlip);
        setTimeout(() => {
          contentElement.classList.remove(styles.pageFlip);
        }, 600);
      }
      
      renderPage(pdfDoc, pageNumber);
    }
  };

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <svg className={styles.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <h3>Error Loading PDF</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p>Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pdfReader}>
      {/* Navigation Bar - ABOVE the viewer */}
      <div className={`${styles.navigation} ${!isNavigationVisible ? styles.hidden : ''}`}>
        <button 
          onClick={prevPage} 
          disabled={currentPage === 1}
          className={styles.navButton}
        >
          ← Previous
        </button>
        
        <div className={styles.pageInput}>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= totalPages) {
                goToPage(page);
              }
            }}
          />
          <span>/ {totalPages}</span>
        </div>
        
        <button 
          onClick={nextPage} 
          disabled={currentPage === totalPages}
          className={styles.navButton}
        >
          Next →
        </button>
      </div>

      {/* PDF Content */}
      <div className={`${styles.readerContainer} ${theme === 'dark' ? styles.darkTheme : ''}`}>
        <div 
          ref={contentRef}
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: pageContent }}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: lineSpacing,
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left',
            color: theme === 'dark' ? '#ecf0f1' : '#2c3e50',
            backgroundColor: theme === 'dark' ? '#2c3e50' : 'white'
          }}
        />
      </div>
    </div>
  );
}; 