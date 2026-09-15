export interface TurboMessageUser {
  id?: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  role?: {
    name?: string;
  };
}

export interface TurboMessage {
  id: number | string;
  ticket_id?: number | string;
  message?: string;
  content?: string;
  sender_name?: string;
  created_at: string;
  is_client_message: number | boolean;
  is_comment?: number;
  media_url?: string | null;
  image?: string | null;
  sender?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    role_name?: string;
  };
  user?: TurboMessageUser;
}

export interface TurboTicketLog {
  id?: number | string;
  description?: string | { ar?: string; en?: string };
  created_at: string;
  user?: {
    id?: number;
    full_name?: string;
    name?: string;
  };
}

export interface TurboTicketItem {
  id: number;
  code?: string | null; // Shipment tracking code
  subject?: string;
  description?: string;
  content?: string;
  status: number | string | { value?: string | number; label?: string };
  rate?: number | null;
  rating?: number | null;
  created_at: string;
  updated_at?: string;
  category_id?: number | string;
  category_name?: string;
  category?: { id: number | string; name: string; related_to?: string };
  messages?: TurboMessage[];
  replies?: TurboMessage[];
  logs?: TurboTicketLog[];
  unread?: boolean;
  creator_name?: string;
  user_name?: string;
  client_name?: string;
  sender_name?: string;
  user?: {
    id?: number | string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar?: string;
  };
  agent?: {
    id?: number | string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar?: string;
  };
  attachment?: string | null;
  attachments?: Array<{ id?: number | string; file_url?: string; url?: string }>;
}

export interface TurboTicketCategory {
  id: number | string;
  name: string;
  nameEn?: string;
  type?: number | string;
}

export interface TurboTicketsPagination {
  page: number;
  perPage: number;
  total: number;
  lastPage?: number;
}
