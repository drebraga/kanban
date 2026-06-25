export type User = {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  name: string;
};
