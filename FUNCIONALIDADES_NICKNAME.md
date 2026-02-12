# ✏️ Funcionalidades de Edição de Nickname

## ✅ Implementado

### 1. Editar Próprio Nickname
- **Localização**: Botão de edição (ícone de lápis) na barra superior do sidebar
- **Como usar**: 
  1. Clique no ícone de lápis ao lado do botão "Adicionar contato"
  2. Digite o novo nickname
  3. Clique em "Salvar"

### 2. Editar Nickname de Outros
- **Localização**: Botão de edição no header do chat (ao lado do nome do contato)
- **Como usar**:
  1. Abra uma conversa com o contato
  2. Clique no ícone de lápis no header do chat
  3. Digite o novo nickname
  4. Clique em "Salvar"

## 🔧 Configuração Necessária

### 1. Executar Função SQL no Supabase

Para permitir editar nicknames de outros usuários, execute este SQL no Supabase:

```sql
-- Função para atualizar nickname de qualquer usuário
CREATE OR REPLACE FUNCTION update_user_nickname(
  target_user_id UUID,
  new_nickname TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar nickname
  IF length(new_nickname) < 3 OR length(new_nickname) > 20 THEN
    RAISE EXCEPTION 'Nickname deve ter entre 3 e 20 caracteres';
  END IF;
  
  IF NOT (new_nickname ~ '^[a-z0-9_]+$') THEN
    RAISE EXCEPTION 'Nickname deve conter apenas letras minúsculas, números e underscore';
  END IF;
  
  -- Verificar se nickname já existe
  IF EXISTS (SELECT 1 FROM public.profiles WHERE nickname = new_nickname AND id != target_user_id) THEN
    RAISE EXCEPTION 'Nickname já está em uso';
  END IF;
  
  -- Atualizar nickname
  UPDATE public.profiles
  SET nickname = new_nickname
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;

-- Dar permissão para todos os usuários autenticados
GRANT EXECUTE ON FUNCTION update_user_nickname(UUID, TEXT) TO authenticated;
```

**Nota**: Esta função já está incluída no arquivo `docs/messaging_schema.sql`. Se você já executou o schema completo, a função já existe!

## 📋 Regras de Validação

- ✅ Nickname deve ter entre **3 e 20 caracteres**
- ✅ Apenas **letras minúsculas**, **números** e **underscore** (_)
- ✅ Deve ser **único** (não pode haver dois usuários com o mesmo nickname)
- ✅ Não pode estar vazio

## 🧪 Como Testar

1. **Criar usuário de teste** (veja `docs/CRIAR_USUARIO_TESTE.md`)
2. **Fazer login** com o usuário de teste
3. **Editar próprio nickname**: Clique no ícone de lápis no sidebar
4. **Criar conversa** com outro usuário
5. **Editar nickname do contato**: Clique no ícone de lápis no header do chat

## 🎯 Usuário de Teste Criado

Após seguir o guia `CRIAR_USUARIO_TESTE.md`, você terá:

**Email**: `teste@stealth.com`  
**Senha**: `Teste123456`  
**Nickname**: `usuario_teste`

Use essas credenciais para testar todas as funcionalidades!
