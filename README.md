# My Jarvis Desktop

AI-powered desktop application with integrated terminal built with Electron, React, TypeScript, and xterm.js.

## Features

- **Three-Panel Layout**: File explorer, document preview, and terminal
- **Fully Functional Terminal**: Powered by xterm.js with WebGL acceleration
- **Cross-Platform**: Works on macOS, Windows, and Linux
- **Modern Stack**: React 19, TypeScript 5, Electron 37
- **GPU Accelerated**: WebGL rendering for smooth terminal performance

## Tech Stack

- **Electron** v37.4.0 - Desktop application framework
- **React** v19.1.1 - UI library
- **TypeScript** v5.9.2 - Type safety
- **xterm.js** v5.5.0 - Terminal emulator
- **node-pty** v1.0.0 - Pseudo terminal support
- **Vite** - Build tool
- **Tailwind CSS** - Styling

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build:mac  # For macOS
npm run build:win  # For Windows
npm run build:linux # For Linux
```

## Project Structure

```
my-jarvis-desktop/
├── app/           # React application
│   ├── components/  # React components
│   └── styles/      # CSS files
├── lib/           # Electron main process
│   ├── main/        # Main process code
│   ├── preload/     # Preload scripts
│   └── conveyor/    # IPC handlers
├── resources/     # Application resources
└── public/        # Static assets
```

## License

MIT

## Author

Erez - [GitHub](https://github.com/erezfern)