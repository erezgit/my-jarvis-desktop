/**
 * Excel Service - API communication layer
 * Handles all backend communication for Excel processing
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface UploadResponse {
  session_id: string;
  filename: string;
  file_path: string;
  sheets: string[];
}

interface UpdateCellData {
  sheet_name: string;
  row: number;
  col: number;
  value: string;
  formula?: string;
}

interface ApiError {
  detail: string;
}

class ExcelServiceClass {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`
      }));
      throw new Error(error.detail);
    }
    return response.json();
  }

  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    return this.handleResponse<UploadResponse>(response);
  }

  async getSheetData(sessionId: string, sheetName?: string) {
    const url = new URL(`${API_BASE_URL}/sheet/${sessionId}`);
    if (sheetName) {
      url.searchParams.append('sheet_name', sheetName);
    }

    const response = await fetch(url.toString());
    return this.handleResponse(response);
  }

  async updateCell(sessionId: string, updateData: UpdateCellData) {
    const response = await fetch(`${API_BASE_URL}/update/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    return this.handleResponse(response);
  }

  async analyzeSheet(sessionId: string, sheetName?: string) {
    const url = new URL(`${API_BASE_URL}/analyze/${sessionId}`);
    if (sheetName) {
      url.searchParams.append('sheet_name', sheetName);
    }

    const response = await fetch(url.toString());
    return this.handleResponse(response);
  }

  getDownloadUrl(sessionId: string): string {
    return `${API_BASE_URL}/download/${sessionId}`;
  }

  // Helper method for downloading files
  async downloadFile(sessionId: string, filename: string): Promise<void> {
    const url = this.getDownloadUrl(sessionId);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const ExcelService = new ExcelServiceClass();