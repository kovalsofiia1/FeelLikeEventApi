export interface UserRequest extends Request {
  user?: {
    id: string,
    email: string,
    status: 'ADMIN' | 'USER' | 'VERIFIED_USER';
  }
}