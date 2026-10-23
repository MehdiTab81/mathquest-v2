-- MathQuest : mise à jour 2 (groupes de besoins, devoirs, aménagements).
-- À coller une fois dans Supabase → SQL Editor → New query → Run, APRÈS schema.sql.
-- Peut être relancé sans risque.

-- ---------- Groupes et aménagements par élève ----------
alter table public.students add column if not exists grp text check (grp is null or char_length(grp) <= 20);
alter table public.students add column if not exists adapt jsonb not null default '{}'::jsonb;
grant select (grp, adapt) on public.students to authenticated;
grant update (grp, adapt) on public.students to authenticated;
drop policy if exists "prof : modifier un élève" on public.students;
create policy "prof : modifier un élève" on public.students for update to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));

-- ---------- Devoirs ----------
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  grp         text,
  title       text not null check (char_length(title) between 1 and 60),
  level       text not null check (level in ('6eme', '5eme', '4eme', '3eme')),
  chapter     text,
  categories  text[],
  n           smallint not null default 10 check (n between 5 and 30),
  due         date,
  created_at  timestamptz not null default now()
);
create index if not exists assignments_class on public.assignments (class_id);

create table if not exists public.assignment_results (
  assignment_id  uuid not null references public.assignments(id) on delete cascade,
  student_id     uuid not null references public.students(id) on delete cascade,
  score          smallint not null,
  total          smallint not null,
  done_at        timestamptz not null default now(),
  primary key (assignment_id, student_id)
);

alter table public.assignments enable row level security;
alter table public.assignment_results enable row level security;
revoke all on public.assignments, public.assignment_results from anon;
grant select, insert, update, delete on public.assignments to authenticated;
grant select on public.assignment_results to authenticated;

drop policy if exists "prof : devoirs" on public.assignments;
create policy "prof : devoirs" on public.assignments for all to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));
drop policy if exists "prof : résultats des devoirs" on public.assignment_results;
create policy "prof : résultats des devoirs" on public.assignment_results for select to authenticated
  using (exists (select 1 from public.assignments a join public.classes c on c.id = a.class_id
                 where a.id = assignment_id and c.teacher_id = auth.uid()));

-- ---------- Fonctions mises à jour ----------

-- Connexion : renvoie aussi le groupe et les aménagements.
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

  return json_build_object('token', v_student.token, 'name', v_student.name, 'class', v_class.name,
                           'level', v_class.level, 'grp', v_student.grp, 'adapt', v_student.adapt);
end $$;

-- Fin de série : compteurs par notion, résumé de série, résultat de devoir.
create or replace function public.mq_record(p_token uuid, p_level text, p_stats jsonb, p_session jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_student public.students;
  v_assignment uuid;
begin
  select * into v_student from public.students where token = p_token;
  if not found then return json_build_object('error', 'SESSION_INVALIDE'); end if;
  if p_level not in ('6eme', '5eme', '4eme', '3eme') then return json_build_object('error', 'NIVEAU'); end if;
  if jsonb_typeof(p_stats) <> 'array' or jsonb_array_length(p_stats) > 120 then return json_build_object('error', 'FORMAT'); end if;

  insert into public.notion_stats as n (student_id, level, category, total, correct, last_at)
  select v_student.id, p_level, left(e->>'c', 80),
         least(greatest((e->>'t')::int, 0), 200),
         least(greatest((e->>'k')::int, 0), least(greatest((e->>'t')::int, 0), 200)),
         now()
  from jsonb_array_elements(p_stats) e
  where coalesce(e->>'c', '') <> ''
  on conflict (student_id, level, category) do update
    set total = n.total + excluded.total, correct = n.correct + excluded.correct, last_at = now();

  if p_session is not null and jsonb_typeof(p_session) = 'object' then
    insert into public.sessions (student_id, level, chapter, mode, score, total, seconds)
    values (v_student.id, p_level, left(coalesce(p_session->>'chapter', ''), 60),
            case when p_session->>'mode' in ('train', 'exam', 'review', 'homework', 'daily', 'sprint', 'place')
                 then p_session->>'mode' else 'train' end,
            least(greatest(coalesce((p_session->>'score')::int, 0), 0), 200),
            least(greatest(coalesce((p_session->>'total')::int, 0), 0), 200),
            least(greatest(coalesce((p_session->>'seconds')::int, 0), 0), 7200));
    delete from public.sessions where student_id = v_student.id and id not in
      (select id from public.sessions where student_id = v_student.id order by played_at desc limit 60);

    if coalesce(p_session->>'assignment', '') ~ '^[0-9a-f-]{36}$' then
      v_assignment := (p_session->>'assignment')::uuid;
      if exists (select 1 from public.assignments a where a.id = v_assignment and a.class_id = v_student.class_id) then
        insert into public.assignment_results as r (assignment_id, student_id, score, total)
        values (v_assignment, v_student.id,
                least(greatest(coalesce((p_session->>'score')::int, 0), 0), 200),
                least(greatest(coalesce((p_session->>'total')::int, 0), 0), 200))
        on conflict (assignment_id, student_id) do update
          set score = greatest(r.score, excluded.score), total = excluded.total, done_at = now();
      end if;
    end if;
  end if;

  update public.students set last_seen = now() where id = v_student.id;
  return json_build_object('ok', true);
end $$;

-- L'élève récupère ses devoirs (classe entière ou son groupe) et ses aménagements.
create or replace function public.mq_sync(p_token uuid) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_student public.students;
begin
  select * into v_student from public.students where token = p_token;
  if not found then return json_build_object('error', 'SESSION_INVALIDE'); end if;
  return json_build_object(
    'grp', v_student.grp,
    'adapt', v_student.adapt,
    'work', coalesce((
      select json_agg(json_build_object('id', a.id, 'title', a.title, 'level', a.level, 'chapter', a.chapter,
                                        'categories', a.categories, 'n', a.n, 'due', a.due) order by a.due nulls last, a.created_at desc)
      from (select * from public.assignments a
            where a.class_id = v_student.class_id
              and (a.grp is null or a.grp = v_student.grp)
              and (a.due is null or a.due >= current_date - 7)
            order by a.created_at desc limit 20) a), '[]'::json),
    'done', coalesce((select json_agg(r.assignment_id) from public.assignment_results r where r.student_id = v_student.id), '[]'::json));
end $$;

revoke all on function public.mq_sync(uuid) from public;
grant execute on function public.mq_sync(uuid) to anon, authenticated;
grant execute on function public.mq_join(text, text, text), public.mq_record(uuid, text, jsonb, jsonb) to anon, authenticated;
