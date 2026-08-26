export interface MockUser {
  id: string;
  email: string;
}

export const USER_A: MockUser = { id: "test-user-a", email: "a@test.com" };
export const USER_B: MockUser = { id: "test-user-b", email: "b@test.com" };
export const ADMIN_USER: MockUser = { id: "test-admin", email: "rlpeixoto@gmail.com" };
export const UNAUTH_USER = null;
