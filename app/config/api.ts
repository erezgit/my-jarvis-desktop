// API configuration - uses absolute URLs for Electron app
// Use VITE_JARVIS_DEV_PORT for development to avoid conflicts
const PORT = import.meta.env.VITE_JARVIS_DEV_PORT || "8081";
const BASE_URL = `http://127.0.0.1:${PORT}`;

export const API_CONFIG = {
  ENDPOINTS: {
    CHAT: `${BASE_URL}/api/chat`,
    ABORT: `${BASE_URL}/api/abort`,
    PROJECTS: `${BASE_URL}/api/projects`,
    HISTORIES: `${BASE_URL}/api/projects`,
    CONVERSATIONS: `${BASE_URL}/api/projects`,
  },
} as const;

// Helper function to get full API URL
export const getApiUrl = (endpoint: string) => {
  return endpoint;
};

// Helper function to get abort URL
export const getAbortUrl = (requestId: string) => {
  return `${API_CONFIG.ENDPOINTS.ABORT}/${requestId}`;
};

// Helper function to get chat URL
export const getChatUrl = () => {
  return API_CONFIG.ENDPOINTS.CHAT;
};

// Helper function to get projects URL
export const getProjectsUrl = () => {
  return API_CONFIG.ENDPOINTS.PROJECTS;
};

// Helper function to get histories URL
export const getHistoriesUrl = (projectPath: string) => {
  const encodedPath = encodeURIComponent(projectPath);
  return `${API_CONFIG.ENDPOINTS.HISTORIES}/${encodedPath}/histories`;
};

// Helper function to get conversation URL
export const getConversationUrl = (
  encodedProjectName: string,
  sessionId: string,
) => {
  return `${API_CONFIG.ENDPOINTS.CONVERSATIONS}/${encodedProjectName}/histories/${sessionId}`;
};
