-- Script de Configuração do Banco de Dados (Supabase)

-- 1. Criar a tabela de garantias
create table public.warranties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  category text,
  purchase_date date not null,
  warranty_months integer not null,
  invoice_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar o Row Level Security (RLS)
alter table public.warranties enable row level security;

-- 3. Criar a política de segurança (Cada usuário só vê o seu)
create policy "Users can manage their own warranties"
  on public.warranties
  for all
  using (auth.uid() = user_id);

-- 4. Configuração para o Storage (Upload de Notas Fiscais)
-- Execute estas políticas após criar um bucket chamado 'invoices' no painel Storage

insert into storage.buckets (id, name, public) 
values ('invoices', 'invoices', true)
on conflict (id) do nothing;

create policy "Allow authenticated uploads"
  on storage.objects for insert
  with check ( bucket_id = 'invoices' AND auth.role() = 'authenticated' );

create policy "Allow owners to see their own files"
  on storage.objects for select
  using ( bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1] );
