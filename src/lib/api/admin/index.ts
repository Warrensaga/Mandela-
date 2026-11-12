// Admin data-access layer. Admin screens import from here only.
// Every call runs as the signed-in user; RLS (is_admin / is_owner) enforces access.
export * from './auth';
export * from './dashboard';
export * from './catalog';
export * from './sales';
export * from './content';
export * from './team';
export { ApiError } from '../errors';
