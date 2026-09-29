-- Invalid organization paths must never fall back to global permissions.
-- Restrictive policies are ANDed with the existing per-operation policies.
create policy "attachments_require_valid_organization"
on storage.objects as restrictive for all
to authenticated
using (
  bucket_id <> 'attachments'
  or (storage.foldername(name))[1] <> 'organizations'
  or private.try_uuid((storage.foldername(name))[2]) is not null
)
with check (
  bucket_id <> 'attachments'
  or (storage.foldername(name))[1] <> 'organizations'
  or private.try_uuid((storage.foldername(name))[2]) is not null
);

-- Keep uploads below the hosted request ceiling, including multipart overhead.
-- Existing larger files remain downloadable; enforce the new limit on new rows.
update storage.buckets set file_size_limit = 4194304 where id = 'attachments';
alter table public.file_records
add constraint file_records_upload_size_limit check (size_bytes <= 4194304) not valid;
