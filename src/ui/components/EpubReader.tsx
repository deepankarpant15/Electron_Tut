import React, { useEffect, useState } from 'react';
import JSZip from 'jszip';
import styles from './EpubReader.module.css';

interface EpubReaderProps {
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

interface Chapter {
  id: string;
  title: string;
  content: string;
}

export const EpubReader: React.FC<EpubReaderProps> = ({ 
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
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processEpubContent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('EPUB Reader: Starting content processing...');
        console.log('EPUB Reader: File size:', fileContent.byteLength, 'bytes');
        
        // Extract actual content from EPUB using JSZip
        const extractedChapters = await extractEpubContent(fileContent);
        setChapters(extractedChapters);
        onTotalPagesChange?.(extractedChapters.length);
        
        console.log('EPUB Reader: Extracted chapters:', extractedChapters.length);

      } catch (err) {
        console.error('EPUB Reader: Error processing content:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to process EPUB content';
        setError(errorMessage);
        onError(errorMessage);
      } finally {
          setIsLoading(false);
      }
    };

 if (fileContent) {
      processEpubContent();
}
  }, [fileContent, onError]);

  const extractEpubContent = async (buffer: ArrayBuffer): Promise<Chapter[]> => {
    const chapters: Chapter[] = [];
    
    try {
      console.log('EPUB Reader: Loading EPUB with JSZip...');
      
      // Load the EPUB file with JSZip
      const zip = new JSZip();
      const zipFile = await zip.loadAsync(buffer);
      
      console.log('EPUB Reader: EPUB loaded, files found:', Object.keys(zipFile.files).length);
      
      // List all files in the EPUB
      const fileNames = Object.keys(zipFile.files);
      console.log('EPUB Reader: File names:', fileNames);
      
      // Find the container.xml to get the OPF file location
      const containerXml = await zipFile.file('META-INF/container.xml')?.async('string');
      console.log('EPUB Reader: Container XML found:', !!containerXml);
      
      if (containerXml) {
        // Parse container.xml to find the OPF file
        const opfMatch = containerXml.match(/<rootfile[^>]*full-path="([^"]*)"[^>]*>/i);
        if (opfMatch) {
          const opfPath = opfMatch[1];
          console.log('EPUB Reader: OPF path found:', opfPath);
          
          // Read the OPF file
          const opfContent = await zipFile.file(opfPath)?.async('string');
          if (opfContent) {
            console.log('EPUB Reader: OPF content loaded, length:', opfContent.length);
            
            // Extract HTML files from OPF
            const htmlFiles = await extractHtmlFilesFromOpf(zipFile, opfContent);
            console.log('EPUB Reader: HTML files found:', htmlFiles.length);
            
            // Convert HTML files to chapters
            for (let i = 0; i < htmlFiles.length; i++) {
              const htmlFile = htmlFiles[i];
              const chapter = await createChapterFromHtml(htmlFile, i + 1);
              if (chapter) {
                chapters.push(chapter);
              }
            }
          }
        }
      }
      
      // If no chapters found through OPF, try to find HTML files directly
      if (chapters.length === 0) {
        console.log('EPUB Reader: No chapters found through OPF, trying direct HTML extraction...');
        const htmlFiles = await extractHtmlFilesDirectly(zipFile);
        console.log('EPUB Reader: Direct HTML files found:', htmlFiles.length);
        
        for (let i = 0; i < htmlFiles.length; i++) {
          const htmlFile = htmlFiles[i];
          const chapter = await createChapterFromHtml(htmlFile, i + 1);
          if (chapter) {
            chapters.push(chapter);
          }
        }
      }
      
    } catch (err) {
      console.error('EPUB Reader: Error extracting EPUB content:', err);
    }
    
    return chapters;
  };

  const extractHtmlFilesFromOpf = async (zipFile: JSZip, opfContent: string): Promise<string[]> => {
    const htmlFiles: string[] = [];
    
    try {
      // Extract the base path from OPF file path
      const opfPath = Object.keys(zipFile.files).find(name => name.endsWith('.opf'));
      const basePath = opfPath ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
      
      // Find all HTML/XHTML files referenced in the OPF
      const htmlMatches = opfContent.match(/<item[^>]*href="([^"]*\.(?:html|xhtml))"[^>]*>/gi);
      
      if (htmlMatches) {
        for (const match of htmlMatches) {
          const hrefMatch = match.match(/href="([^"]*\.(?:html|xhtml))"/i);
          if (hrefMatch) {
            const htmlPath = basePath + hrefMatch[1];
            console.log('EPUB Reader: Found HTML file in OPF:', htmlPath);
            htmlFiles.push(htmlPath);
          }
        }
      }
      
      // Also extract CSS files for styling
      const cssMatches = opfContent.match(/<item[^>]*href="([^"]*\.css)"[^>]*>/gi);
      if (cssMatches) {
        for (const match of cssMatches) {
          const hrefMatch = match.match(/href="([^"]*\.css)"/i);
          if (hrefMatch) {
            const cssPath = basePath + hrefMatch[1];
            console.log('EPUB Reader: Found CSS file in OPF:', cssPath);
            await extractCssStyles(zipFile, cssPath);
          }
        }
      }
      
    } catch (err) {
      console.error('EPUB Reader: Error extracting HTML files from OPF:', err);
    }
    
    return htmlFiles;
  };

  const extractCssStyles = async (zipFile: JSZip, cssPath: string) => {
    try {
      const cssContent = await zipFile.file(cssPath)?.async('string');
      if (cssContent) {
        console.log('EPUB Reader: CSS content loaded for', cssPath, 'length:', cssContent.length);
        
        // Inject CSS into the document
        const styleElement = document.createElement('style');
        styleElement.textContent = cssContent;
        document.head.appendChild(styleElement);
        
        console.log('EPUB Reader: CSS styles injected into document');
      }
    } catch (err) {
      console.error('EPUB Reader: Error extracting CSS:', err);
    }
  };

  const extractHtmlFilesDirectly = async (zipFile: JSZip): Promise<string[]> => {
    const htmlFiles: string[] = [];
    
    try {
      // Look for HTML/XHTML files directly in the ZIP
      for (const fileName of Object.keys(zipFile.files)) {
        if (fileName.match(/\.(html|xhtml)$/i) && !fileName.includes('META-INF')) {
          console.log('EPUB Reader: Found HTML file directly:', fileName);
          htmlFiles.push(fileName);
        }
        
        // Also look for CSS files
        if (fileName.match(/\.css$/i) && !fileName.includes('META-INF')) {
          console.log('EPUB Reader: Found CSS file directly:', fileName);
          await extractCssStyles(zipFile, fileName);
        }
      }
      
    } catch (err) {
      console.error('EPUB Reader: Error extracting HTML files directly:', err);
    }
    
    return htmlFiles;
  };

  const createChapterFromHtml = async (htmlPath: string, chapterIndex: number): Promise<Chapter | null> => {
    try {
      const zip = new JSZip();
      const zipFile = await zip.loadAsync(fileContent);
      
      const htmlContent = await zipFile.file(htmlPath)?.async('string');
      if (!htmlContent) {
        console.log('EPUB Reader: Could not read HTML file:', htmlPath);
        return null;
      }
      
      console.log('EPUB Reader: HTML content loaded for', htmlPath, 'length:', htmlContent.length);
      
      // Extract title and content from HTML
      const title = extractTitleFromHtml(htmlContent) || `Chapter ${chapterIndex}`;
      const content = extractContentFromHtml(htmlContent);
      
      if (content.trim().length > 0) {
        return {
          id: `chapter-${chapterIndex}`,
          title: title,
          content: content
        };
      }
      
    } catch (err) {
      console.error('EPUB Reader: Error creating chapter from HTML:', err);
    }
    
    return null;
  };

  const extractTitleFromHtml = (html: string): string | null => {
    try {
      // Try to find title in various ways
      const titlePatterns = [
        /<title[^>]*>(.*?)<\/title>/i,
        /<h1[^>]*>(.*?)<\/h1>/i,
        /<h2[^>]*>(.*?)<\/h2>/i,
        /<h3[^>]*>(.*?)<\/h3>/i
      ];
      
      for (const pattern of titlePatterns) {
        const match = html.match(pattern);
        if (match && match[1].trim().length > 0) {
          return cleanTextContent(match[1]);
        }
      }
      
    } catch (err) {
      console.log('EPUB Reader: Error extracting title:', err);
    }
    
    return null;
  };

  const extractContentFromHtml = (html: string): string => {
    try {
      // Clean the HTML content but preserve formatting
      let content = cleanHtmlContent(html);
      
      // Try to extract body content specifically
      const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        content = bodyMatch[1];
      }
      
      // Return the HTML content directly instead of converting to plain text
      return content;
      
    } catch (err) {
      console.error('EPUB Reader: Error extracting content from HTML:', err);
      return '';
    }
  };

  const cleanHtmlContent = (html: string): string => {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<meta[^>]*>/gi, '') // Remove meta tags
      .replace(/<link[^>]*>/gi, '') // Remove link tags
      .replace(/&nbsp;/g, ' ') // Replace HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  };

  const cleanTextContent = (text: string): string => {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n')
      .substring(0, 20000); // Increase content limit
  };

  const nextChapter = () => {
    if (currentChapter < chapters.length - 1) {
      const newChapter = currentChapter + 1;
      setCurrentChapter(newChapter);
      onPageChange?.(newChapter + 1);
      
      // Add page flip animation
      const contentElement = document.querySelector(`.${styles.content}`);
      if (contentElement) {
        contentElement.classList.add(styles.pageFlip);
        setTimeout(() => {
          contentElement.classList.remove(styles.pageFlip);
        }, 600);
      }
    }
  };

  const prevChapter = () => {
    if (currentChapter > 0) {
      const newChapter = currentChapter - 1;
      setCurrentChapter(newChapter);
      onPageChange?.(newChapter + 1);
      
      // Add page flip animation
      const contentElement = document.querySelector(`.${styles.content}`);
      if (contentElement) {
        contentElement.classList.add(styles.pageFlip);
        setTimeout(() => {
          contentElement.classList.remove(styles.pageFlip);
        }, 600);
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const goToChapter = (index: number) => {
  //   if (index >= 0 && index < chapters.length) {
  //     setCurrentChapter(index);
  //     onPageChange?.(index + 1);
      
  //     // Add page flip animation
  //     const contentElement = document.querySelector(`.${styles.content}`);
  //     if (contentElement) {
  //       contentElement.classList.add(styles.pageFlip);
  //       setTimeout(() => {
  //         contentElement.classList.remove(styles.pageFlip);
  //       }, 600);
  //     }
  //   }
  // };

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <svg className={styles.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <h3>Error Loading EPUB</h3>
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
          <p>Extracting EPUB content...</p>
        </div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h3>No Content Found</h3>
          <p>Could not extract readable content from this EPUB file. The file may be encrypted or in an unsupported format.</p>
        </div>
      </div>
    );
  }

  //const currentChapterData = chapters[currentChapter];

  return (
    <div className={styles.epubReader}>
      {/* Navigation Bar */}
      <div className={`${styles.navigation} ${!isNavigationVisible ? styles.hidden : ''}`}>
        <button 
          onClick={prevChapter} 
          disabled={currentChapter === 0}
          className={styles.navButton}
        >
          ← Previous Chapter
        </button>
        
        <div className={styles.chapterInfo}>
          <span>Chapter {currentChapter + 1} of {chapters.length}</span>
        </div>
        
        <button 
          onClick={nextChapter} 
          disabled={currentChapter === chapters.length - 1}
          className={styles.navButton}
        >
          Next Chapter →
        </button>
      </div>

      {/* EPUB Content with Page Flipping Animation */}
      <div className={`${styles.readerContainer} ${theme === 'dark' ? styles.darkTheme : ''}`}>
        <div 
          className={styles.content}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: lineSpacing,
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left',
            color: theme === 'dark' ? '#ecf0f1' : '#2c3e50',
            backgroundColor: theme === 'dark' ? '#2c3e50' : 'white'
          }}
          dangerouslySetInnerHTML={{ 
            __html: chapters[currentChapter]?.content || '<p>No content available</p>' 
          }}
        />
      </div>
    </div>
  );
}; 