-- Contract platform-admin survey edits without removing legacy compatibility
-- fields. Survey identifiers and asset-routing fields remain intact.

create or replace function public.platform_admin_update_survey(
  survey_id text,
  survey_location text default null,
  survey_flight_date date default null,
  survey_area numeric default null,
  survey_area_code text default null,
  survey_type text default null,
  survey_category text default null,
  survey_status public.mission_status default 'draft'
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app_private.domain_is_platform_admin() then
    raise exception 'platform administrator access required'
      using errcode = '42501';
  end if;

  if survey_area is not null and survey_area < 0 then
    raise exception 'survey area cannot be negative'
      using errcode = '22023';
  end if;

  update public.surveys
  set location = nullif(btrim(survey_location), ''),
      flight_date = survey_flight_date,
      area = survey_area,
      area_code = nullif(btrim(survey_area_code), ''),
      type = nullif(btrim(survey_type), ''),
      category = nullif(btrim(survey_category), ''),
      status = survey_status
  where id = survey_id;

  if not found then
    raise exception 'survey not found'
      using errcode = 'P0002';
  end if;

  return survey_id;
end
$$;

revoke update on public.surveys from authenticated;

revoke all on function public.platform_admin_update_survey(
  text, text, date, numeric, text, text, text, public.mission_status
) from public, anon;

grant execute on function public.platform_admin_update_survey(
  text, text, date, numeric, text, text, text, public.mission_status
) to authenticated;
