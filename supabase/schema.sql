-- MathQuest : suivi des élèves dans Supabase (offre gratuite).
-- À coller une seule fois dans Supabase → SQL Editor → New query → Run.
--
-- Principe d'économie : on ne stocke PAS chaque réponse. Pour chaque élève et chaque notion,
-- deux compteurs (réponses, réponses justes) sont mis à jour à la fin d'une série, plus un court
-- résumé de série (60 dernières séries par élève au maximum).
-- Ordre de grandeur : une classe de 30 élèves sur une année ≈ 1 à 2 Mo (l'offre gratuite en permet 500).
--
-- Sécurité : les élèves n'ont pas de compte. Ils passent uniquement par les fonctions mq_*,
-- qui vérifient le code de classe, le prénom et le code à 4 chiffres (stocké chiffré).
-- Les tables sont fermées aux visiteurs ; chaque professeur ne voit que ses propres classes.

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tables ----------

create or replace function public.mq_new_code() returns text
language sql volatile set search_path = public, extensions as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 6);
$$;

create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  level       text not null check (level in ('6eme', '5eme', '4eme', '3eme')),
  code        text not null unique default public.mq_new_code(),
  created_at  timestamptz not null default now()
);

create table if not exists public.students (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.classes(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 24),
  pin_hash      text not null,
  token         uuid not null default gen_random_uuid(),
  fails         smallint not null default 0,
  locked_until  timestamptz,
  created_at    timestamptz not null default now(),
  last_seen     timestamptz
);
create unique index if not exists students_class_name on public.students (class_id, lower(name));
create unique index if not exists students_token on public.students (token);

create table if not exists public.notion_stats (
  student_id  uuid not null references public.students(id) on delete cascade,
  level       text not null,
  category    text not null,
  total       integer not null default 0,
  correct     integer not null default 0,
  last_at     timestamptz not null default now(),
  primary key (student_id, level, category)
);

create table if not exists public.sessions (
  id          bigint generated always as identity primary key,
  student_id  uuid not null references public.students(id) on delete cascade,
  played_at   timestamptz not null default now(),
  level       text not null,
  chapter     text not null,
  mode        text not null,
  score       smallint not null,
  total       smallint not null,
  seconds     integer
);
create index if not exists sessions_student on public.sessions (student_id, played_at desc);

-- ---------- Droits : rien pour les visiteurs, lecture de ses classes pour le professeur ----------

alter table public.classes      enable row level security;
alter table public.students     enable row level security;
alter table public.notion_stats enable row level security;
alter table public.sessions     enable row level security;

revoke all on public.classes, public.students, public.notion_stats, public.sessions from anon;
revoke all on public.students from authenticated;
grant select (id, class_id, name, created_at, last_seen), delete on public.students to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select on public.notion_stats, public.sessions to authenticated;

drop policy if exists "prof : ses classes" on public.classes;
create policy "prof : ses classes" on public.classes for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists "prof : ses élèves" on public.students;
create policy "prof : ses élèves" on public.students for select to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));
drop policy if exists "prof : retirer un élève" on public.students;
create policy "prof : retirer un élève" on public.students for delete to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));

drop policy if exists "prof : compteurs" on public.notion_stats;
create policy "prof : compteurs" on public.notion_stats for select to authenticated
  using (exists (select 1 from public.students s join public.classes c on c.id = s.class_id
                 where s.id = student_id and c.teacher_id = auth.uid()));

drop policy if exists "prof : séries" on public.sessions;
create policy "prof : séries" on public.sessions for select to authenticated
  using (exists (select 1 from public.students s join public.classes c on c.id = s.class_id
                 where s.id = student_id and c.teacher_id = auth.uid()));

-- ---------- Fonctions appelées par l'appli ----------

-- Un élève rejoint sa classe (ou se reconnecte) avec code de classe + prénom + code à 4 chiffres.
create or replace function public.mq_join(p_code text, p_name text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_class public.classes;
  v_student public.students;
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if coalesce(p_pin, '') !~ '^\d{4}$' then return json_build_object('error', 'PIN_FORMAT'); end if;
  if char_length(v_name) not between 1 and 24 then return json_build_object('error', 'NOM_FORMAT'); end if;
  select * into v_class from public.classes where code = upper(btrim(p_code));
  if not found then return json_build_object('error', 'CLASSE_INCONNUE'); end if;

  select * into v_student from public.students where class_id = v_class.id and lower(name) = lower(v_name);
  if not found then
    if (select count(*) from public.students where class_id = v_class.id) >= 45 then
      return json_build_object('error', 'CLASSE_PLEINE');
    end if;
    insert into public.students (class_id, name, pin_hash, last_seen)
      values (v_class.id, v_name, crypt(p_pin, gen_salt('bf')), now())
      returning * into v_student;
  else
    if v_student.locked_until is not null and v_student.locked_until > now() then
      return json_build_object('error', 'BLOQUE');
    end if;
    if v_student.pin_hash <> crypt(p_pin, v_student.pin_hash) then
      update public.students
        set fails = case when fails >= 4 then 0 else fails + 1 end,
            locked_until = case when fails >= 4 then now() + interval '10 minutes' else null end
        where id = v_student.id;
      return json_build_object('error', 'PIN_FAUX');
    end if;
    update public.students set fails = 0, locked_until = null, last_seen = now() where id = v_student.id;
  end if;

  return json_build_object('token', v_student.token, 'name', v_student.name,
                           'class', v_class.name, 'level', v_class.level);
end $$;

-- Fin de série : ajoute les compteurs par notion et un résumé de la série.
create or replace function public.mq_record(p_token uuid, p_level text, p_stats jsonb, p_session jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  select id into v_id from public.students where token = p_token;
  if not found then return json_build_object('error', 'SESSION_INVALIDE'); end if;
  if p_level not in ('6eme', '5eme', '4eme', '3eme') then return json_build_object('error', 'NIVEAU'); end if;
  if jsonb_typeof(p_stats) <> 'array' or jsonb_array_length(p_stats) > 120 then return json_build_object('error', 'FORMAT'); end if;

  insert into public.notion_stats as n (student_id, level, category, total, correct, last_at)
  select v_id, p_level, left(e->>'c', 80),
         least(greatest((e->>'t')::int, 0), 100),
         least(greatest((e->>'k')::int, 0), least(greatest((e->>'t')::int, 0), 100)),
         now()
  from jsonb_array_elements(p_stats) e
  where coalesce(e->>'c', '') <> ''
  on conflict (student_id, level, category) do update
    set total = n.total + excluded.total, correct = n.correct + excluded.correct, last_at = now();

  if p_session is not null and jsonb_typeof(p_session) = 'object' then
    insert into public.sessions (student_id, level, chapter, mode, score, total, seconds)
    values (v_id, p_level, left(coalesce(p_session->>'chapter', ''), 60),
            case when p_session->>'mode' in ('train', 'exam') then p_session->>'mode' else 'train' end,
            least(greatest(coalesce((p_session->>'score')::int, 0), 0), 50),
            least(greatest(coalesce((p_session->>'total')::int, 0), 0), 50),
            least(greatest(coalesce((p_session->>'seconds')::int, 0), 0), 7200));
    delete from public.sessions where student_id = v_id and id not in
      (select id from public.sessions where student_id = v_id order by played_at desc limit 60);
  end if;

  update public.students set last_seen = now() where id = v_id;
  return json_build_object('ok', true);
end $$;

-- L'élève retrouve sa progression sur un autre appareil.
create or replace function public.mq_my_stats(p_token uuid) returns table (level text, category text, total integer, correct integer)
language sql security definer set search_path = public as $$
  select n.level, n.category, n.total, n.correct
  from public.notion_stats n join public.students s on s.id = n.student_id
  where s.token = p_token;
$$;

-- Le professeur donne un nouveau code à 4 chiffres à un élève qui l'a oublié.
create or replace function public.mq_reset_pin(p_student uuid, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  if coalesce(p_pin, '') !~ '^\d{4}$' then return json_build_object('error', 'PIN_FORMAT'); end if;
  update public.students s set pin_hash = crypt(p_pin, gen_salt('bf')), fails = 0, locked_until = null,
         token = gen_random_uuid()
  where s.id = p_student
    and exists (select 1 from public.classes c where c.id = s.class_id and c.teacher_id = auth.uid());
  if not found then return json_build_object('error', 'INTERDIT'); end if;
  return json_build_object('ok', true);
end $$;

revoke all on function public.mq_join(text, text, text), public.mq_record(uuid, text, jsonb, jsonb),
  public.mq_my_stats(uuid), public.mq_reset_pin(uuid, text), public.mq_new_code() from public;
grant execute on function public.mq_join(text, text, text), public.mq_record(uuid, text, jsonb, jsonb),
  public.mq_my_stats(uuid) to anon, authenticated;
grant execute on function public.mq_reset_pin(uuid, text) to authenticated;
grant execute on function public.mq_new_code() to authenticated;

-- Taille occupée (à lancer quand vous voulez vérifier) :
-- select pg_size_pretty(pg_database_size(current_database()));
