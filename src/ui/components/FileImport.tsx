import React, { useState } from 'react';
import styles from './FileImport.module.css';

interface FileImportProps {
  onFileSelected: (filePath: string, fileType: 'epub' | 'pdf') => void;
  onError: (message: string) => void;
}

export const FileImport: React.FC<FileImportProps> = ({ onFileSelected, onError }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFileImport = async () => {
    setIsLoading(true);
    
    try {
      const filePath = await window.electronAPI.openFileDialog();
      
      if (!filePath) {
        setIsLoading(false);
        return; // User cancelled
      }

      // Validate file type
      const fileExtension = filePath.toLowerCase().split('.').pop();
      
      if (!fileExtension || !['epub', 'pdf'].includes(fileExtension)) {
        onError('Please select a valid EPUB or PDF file.');
        setIsLoading(false);
        return;
      }

      // Validate file exists and is readable
      // Note: In a real app, you'd want to check file size and other properties
      
      onFileSelected(filePath, fileExtension as 'epub' | 'pdf');
    } catch (error) {
      console.error('File import error:', error);
      onError('Failed to import file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.fileImport}>
      <button 
        onClick={handleFileImport}
        disabled={isLoading}
        className={`${styles.importButton} ${isLoading ? styles.loading : ''}`}
      >
        {isLoading ? (
          <>
            <div className={styles.spinner}></div>
            Importing...
          </>
        ) : (
          <>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Import Book
          </>
        )}
      </button>
      
      <div className={styles.supportedFormats}>
        <p>Supported formats: EPUB, PDF</p>
      </div>
    </div>
  );
}; 