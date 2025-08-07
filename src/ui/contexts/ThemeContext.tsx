import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Define the shape of our context state
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Create the context with a default value.
// We use 'undefined' and a check in the hook to ensure it's always used within a Provider.
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Define props for the provider component
interface ThemeProviderProps {
  children: ReactNode;
}

// The Provider component manages the theme state and provides it to its children
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme(currentTheme => (currentTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// This custom hook makes it easy for any component to access the theme state
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};