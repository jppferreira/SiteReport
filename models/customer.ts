export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  postcode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerDraft = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  postcode?: string;
};