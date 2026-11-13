-- Performance advisor: foreign key admin_access_requests.decided_by had no
-- covering index (used when an approving admin is deleted or looked up).
create index if not exists admin_access_requests_decided_by_idx
  on public.admin_access_requests (decided_by);
