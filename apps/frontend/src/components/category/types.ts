export interface ManagedCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  parentId: string | null;
  sortOrder?: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  _count?: {
    products: number;
  };
}

export default ManagedCategory;
