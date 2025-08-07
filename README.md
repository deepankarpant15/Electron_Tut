# 📚ReadEase

A modern, feature-rich book reading application built with Electron and React. Experience the joy of reading with realistic page flipping animations, automatic progress tracking, and bookmark management.

## ✨ Features

### 📖 Book Reading

- **Realistic Page Flipping**: Smooth animations that mimic real book page turns
- **Progress Tracking**: Automatically saves your reading progress
- **Resume Reading**: Pick up exactly where you left off
- **Multiple File Formats**: Support for text files (.txt)

### 🔖 Bookmark Management

- **Add Bookmarks**: Mark important pages and lines
- **Bookmark Navigation**: Jump directly to bookmarked locations
- **Bookmark History**: View all your bookmarks with timestamps
- **Delete Bookmarks**: Remove bookmarks you no longer need

### 📊 Reading History

- **Recent Books**: View and access your recently read books
- **Reading Progress**: Visual progress bar showing completion
- **Auto-Save**: Progress is automatically saved when you close the app

### 🎨 Modern UI

- **Beautiful Design**: Clean, modern interface with smooth animations
- **Responsive Layout**: Works perfectly on different screen sizes
- **Dark Mode Support**: Automatic dark mode detection

## 🚀 Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd folder_name
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

### Building Distributables

- **Windows**: `npm run dist:win`
- **macOS**: `npm run dist:mac`
- **Linux**: `npm run dist:linux`

## 📖 How to Use

### Opening a Book

1. Click the "📖 Import Book" button on the welcome screen
2. Select a pdf/epub file from your computer
3. The book will load and display the first page

### Navigation

- **Previous/Next Buttons**: Click to navigate between pages
- **Progress Bar**: Shows your reading progress
- **Page Counter**: Displays current page and total pages

### Bookmarks

- **Add Bookmark**: Click "➕ Add Bookmark" to mark the current page
- **View Bookmarks**: Click "🔖 Bookmarks" to see all your bookmarks
- **Delete Bookmark**: Click "Delete" to remove unwanted bookmarks

### Reading Progress

- Your progress is automatically saved as you read
- When you reopen a book, you'll start exactly where you left off
- Recent books are displayed on the welcome screen

## 🛠️ Technical Details

### Built With

- **Electron**: Cross-platform desktop application framework
- **React**: Modern UI library with hooks
- **TypeScript**: Type-safe JavaScript
- **Framer Motion**: Smooth animations and transitions
- **Electron Store**: Persistent data storage
- **Vite**: Fast build tool and development server

### Architecture

- **Main Process**: Handles file operations, data persistence, and app lifecycle
- **Renderer Process**: React UI with modern animations
- **IPC Communication**: Secure communication between processes
- **Data Storage**: Local storage for reading progress and bookmarks

### File Structure

```
src/
├── electron/          # Main process files
│   ├── main.ts       # Main process entry point
│   ├── preload.cts   # Preload script for IPC
│   └── ...
├── ui/               # React application
│   ├── App.tsx       # Main React component
│   ├── App.css       # Styles
│   └── ...
```

## 🎯 Key Features Explained

### Page Flipping Animation

- Pages slide in from the right when going forward
- Pages slide out to the left when going backward
- Smooth opacity transitions for natural feel

### Progress Tracking

- Tracks current page, line, and total pages
- Automatically saves progress when navigating
- Saves progress when app closes
- Stores reading history for multiple books

### Bookmark System

- Unique bookmarks with timestamps
- Visual bookmark management interface
- Persistent bookmark storage

### Recent Books

- Shows last books you've read
- Displays current page and last read date

## 🔧 Configuration

### Customizing Lines Per Page

Edit the `linesPerPage` state in `App.tsx` to adjust how many lines appear on each page.

### Changing Animation Duration

Modify the `transition` property in the page animation components to adjust animation speed.

### Styling

All styles are in `App.css` and can be customized to match your preferences.

## 🐛 Troubleshooting

### Common Issues

**Book won't open**

- Ensure the file is a valid filetype
- Check file permissions
- Try restarting the app

**Progress not saving**

- Ensure electron is properly installed
- Check console for error messages

**Animations not working**

- Check browser console for errors
- Try refreshing the app

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
