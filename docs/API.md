# 📚 Documentação da API - Stealth Messaging

Documentação completa das APIs e endpoints do sistema.

---

## 🔐 Autenticação

### POST `/api/auth/signup`
Criar nova conta de usuário.

**Request:**
```json
{
  "email": "usuario@example.com",
  "password": "senha123",
  "nickname": "nickname_usuario"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@example.com"
  },
  "session": {
    "access_token": "token",
    "refresh_token": "token"
  }
}
```

---

### POST `/api/auth/login`
Fazer login na aplicação.

**Request:**
```json
{
  "email": "usuario@example.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@example.com"
  },
  "session": {
    "access_token": "token",
    "refresh_token": "token"
  }
}
```

---

## 💬 Mensagens

### GET `/api/messages?chatId={chatId}&page={page}&limit={limit}`
Buscar mensagens de uma conversa.

**Query Parameters:**
- `chatId` (string, obrigatório): ID da conversa
- `page` (number, opcional): Número da página (padrão: 1)
- `limit` (number, opcional): Mensagens por página (padrão: 50)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "sender_id": "uuid",
      "chat_id": "uuid",
      "content": "Texto da mensagem",
      "created_at": "2026-02-13T10:00:00Z",
      "media_url": "https://...",
      "media_type": "image",
      "read_at": null,
      "expires_at": null,
      "is_ephemeral": false
    }
  ],
  "hasMore": true,
  "page": 1
}
```

---

### POST `/api/messages`
Enviar nova mensagem.

**Request:**
```json
{
  "chat_id": "uuid",
  "content": "Texto da mensagem",
  "media_url": "https://...",
  "media_type": "image",
  "expires_at": "2026-02-13T11:00:00Z",
  "is_ephemeral": false
}
```

**Response:**
```json
{
  "id": "uuid",
  "sender_id": "uuid",
  "chat_id": "uuid",
  "content": "Texto da mensagem",
  "created_at": "2026-02-13T10:00:00Z"
}
```

---

## 👥 Conversas

### GET `/api/chats`
Listar todas as conversas do usuário.

**Response:**
```json
{
  "chats": [
    {
      "id": "uuid",
      "type": "private",
      "recipient": {
        "id": "uuid",
        "nickname": "usuario2",
        "avatar_url": "https://..."
      },
      "lastMessage": "Última mensagem",
      "time": "2026-02-13T10:00:00Z",
      "muted": false
    }
  ]
}
```

---

### POST `/api/chats`
Criar nova conversa.

**Request:**
```json
{
  "recipient_id": "uuid",
  "type": "private"
}
```

**Response:**
```json
{
  "id": "uuid",
  "type": "private",
  "created_at": "2026-02-13T10:00:00Z"
}
```

---

## 🔔 Push Notifications

### POST `/api/push/subscribe`
Registrar dispositivo para receber notificações push.

**Request:**
```json
{
  "subscription": {
    "endpoint": "https://...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Inscrição realizada com sucesso"
}
```

---

### POST `/api/push/send`
Enviar notificação push (usado internamente).

**Request:**
```json
{
  "recipientId": "uuid",
  "content": "Conteúdo da notificação",
  "isMessage": true,
  "title": "Nova mensagem"
}
```

---

## 🔍 Busca

### GET `/api/users/search?query={query}&type={email|nickname}`
Buscar usuários por email ou nickname.

**Query Parameters:**
- `query` (string, obrigatório): Termo de busca
- `type` (string, opcional): "email" ou "nickname" (padrão: "nickname")

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "nickname": "usuario",
      "email": "usuario@example.com",
      "avatar_url": "https://..."
    }
  ]
}
```

---

## ⚙️ Configurações

### GET `/api/settings`
Obter configurações do usuário.

**Response:**
```json
{
  "autoLockTimeout": 10,
  "incognitoMode": false,
  "mutedChats": ["uuid1", "uuid2"]
}
```

---

### PUT `/api/settings`
Atualizar configurações do usuário.

**Request:**
```json
{
  "autoLockTimeout": 30,
  "incognitoMode": true
}
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "autoLockTimeout": 30,
    "incognitoMode": true
  }
}
```

---

## 🔒 Criptografia E2E

### POST `/api/encryption/generate-keys`
Gerar par de chaves para criptografia E2E.

**Request:**
```json
{
  "pin": "1234"
}
```

**Response:**
```json
{
  "publicKey": "base64...",
  "privateKeyEncrypted": "base64..."
}
```

---

## 📊 Erros

Todos os endpoints retornam erros no formato:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensagem de erro amigável",
    "details": {}
  }
}
```

**Códigos de erro comuns:**
- `UNAUTHORIZED`: Não autenticado
- `FORBIDDEN`: Sem permissão
- `NOT_FOUND`: Recurso não encontrado
- `VALIDATION_ERROR`: Dados inválidos
- `RATE_LIMIT_EXCEEDED`: Muitas requisições
- `INTERNAL_ERROR`: Erro interno do servidor

---

## 🔐 Autenticação nas Requisições

A maioria dos endpoints requer autenticação via token JWT no header:

```
Authorization: Bearer {access_token}
```

O token é obtido após login e pode ser renovado usando o `refresh_token`.

---

## 📝 Notas

- Todas as datas são em formato ISO 8601 (UTC)
- IDs são UUIDs v4
- Limites de rate limiting: 100 requisições/minuto por usuário
- Tamanho máximo de mensagem: 10.000 caracteres
- Tamanho máximo de arquivo: 50MB

---

**Última atualização:** 2026-02-13
