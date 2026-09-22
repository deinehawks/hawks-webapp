alter table if exists public.orthos
  drop constraint if exists orthos_survey_id_fkey;

alter table if exists public.point_clouds
  drop constraint if exists point_clouds_survey_id_fkey;

alter table if exists public.surveys
  drop constraint if exists surveys_id_key;

alter table if exists public.orthos
  add constraint orthos_survey_id_fkey
  foreign key (survey_id) references public.surveys(id);

alter table if exists public.point_clouds
  add constraint point_clouds_survey_id_fkey
  foreign key (survey_id) references public.surveys(id);