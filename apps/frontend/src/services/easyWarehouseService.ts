import api from './api';

export interface EasyWarehouseSettings {
  easyWarehouseMode: boolean;
}

const easyWarehouseService = {
  getSettings: (): Promise<{ success: boolean; data: EasyWarehouseSettings }> =>
    api.get<{ success: boolean; data: EasyWarehouseSettings }>('/easy-warehouse/settings').then((res) => res.data),
  updateSettings: (easyWarehouseMode: boolean): Promise<{ success: boolean; data: EasyWarehouseSettings }> =>
    api.put<{ success: boolean; data: EasyWarehouseSettings }>('/easy-warehouse/settings', { easyWarehouseMode }).then((res) => res.data)
};

export default easyWarehouseService;
