import api from './api';

export interface BulkStatusResultRow {
  orderNumber: string;
  status: string;
  success: boolean;
  message?: string;
}

export interface BulkStatusResponse {
  success: boolean;
  data: {
    summary: { total: number; success: number; failed: number };
    results: BulkStatusResultRow[];
  };
}

const bulkStatusUpdateService = {
  downloadTemplate: async (): Promise<void> => {
    const res = await api.get<Blob>('/orders/bulk-status/template', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as unknown as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-status-template.xlsx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },
  uploadFile: (file: File): Promise<BulkStatusResponse> => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<BulkStatusResponse>('/orders/bulk-status', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      .then((res) => res.data);
  }
};

export default bulkStatusUpdateService;
