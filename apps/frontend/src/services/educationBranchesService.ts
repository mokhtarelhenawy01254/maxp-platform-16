import { apiClient } from "./apiClient";

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  type?: string;
  isActive?: boolean;
}

export interface EducationBranch {
  id: string;
  name: string;
  address?: string;
  city?: string;
  phone: string;
  email?: string;
  workingHours?: string;
  googleMapsUrl?: string;
  managerName?: string;
  managerPhone?: string;
  classrooms: Classroom[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  totalClassrooms?: number;
  activeClassroomsCount?: number;
  totalCapacity?: number;
  activeCapacity?: number;
}

export const educationBranchesService = {
  getBranches: async (): Promise<{ data: EducationBranch[] }> => {
    const res = await apiClient.get<{ success?: boolean; data: EducationBranch[] }>("/education/branches");
    const data = res.data?.data ?? (Array.isArray(res.data) ? (res.data as unknown as EducationBranch[]) : []);
    return { data };
  },

  getBranchById: async (id: string): Promise<{ data: EducationBranch }> => {
    const res = await apiClient.get<{ success?: boolean; data: EducationBranch }>(`/education/branches/${id}`);
    const data = res.data?.data ?? (res.data as unknown as EducationBranch);
    return { data };
  },

  createBranch: async (data: Partial<EducationBranch>): Promise<{ data: EducationBranch }> => {
    const res = await apiClient.post<{ success?: boolean; data: EducationBranch }>("/education/branches", data);
    const result = res.data?.data ?? (res.data as unknown as EducationBranch);
    return { data: result };
  },

  updateBranch: async (id: string, data: Partial<EducationBranch>): Promise<{ data: EducationBranch }> => {
    const res = await apiClient.put<{ success?: boolean; data: EducationBranch }>(`/education/branches/${id}`, data);
    const result = res.data?.data ?? (res.data as unknown as EducationBranch);
    return { data: result };
  },

  deleteBranch: async (id: string): Promise<void> => {
    await apiClient.delete(`/education/branches/${id}`);
  },

  toggleBranchStatus: async (id: string): Promise<{ data: EducationBranch }> => {
    const res = await apiClient.patch<{ success?: boolean; data: EducationBranch }>(`/education/branches/${id}/toggle-status`);
    const result = res.data?.data ?? (res.data as unknown as EducationBranch);
    return { data: result };
  },
};

export default educationBranchesService;
