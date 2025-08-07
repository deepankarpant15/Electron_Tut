declare module 'epubjs' {
  interface Book {
    ready: Promise<void>;
    rendition: {
      new(container: HTMLElement, options?: any): Rendition;
    };
    spine: {
      items: Array<{ href: string }>;
    };
  }

  interface Rendition {
    display(href?: string): Promise<void>;
  }

  function ePub(source: ArrayBuffer | string): Book;
  
  export default ePub;
} 