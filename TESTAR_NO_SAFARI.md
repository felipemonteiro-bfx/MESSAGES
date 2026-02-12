# 📱 Como Testar no iPhone Safari

## 🎯 Método 1: Testar Localmente no iPhone (Mesma Rede WiFi)

### Passo 1: Descobrir IP do Computador

**Windows:**
```powershell
ipconfig
```
Procure por "IPv4 Address" (exemplo: `192.168.1.100`)

**Mac:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Passo 2: Iniciar Servidor

```bash
cd C:\Users\Administrador\stealth-messaging
yarn dev
```

O servidor deve iniciar em: `http://localhost:3005`

### Passo 3: Permitir Conexões Externas

**Next.js já permite por padrão**, mas verifique:

1. No terminal, você deve ver algo como:
```
  ▲ Next.js 15.1.6
  - Local:        http://localhost:3005
  - Network:      http://192.168.1.100:3005
```

2. Se não aparecer "Network", adicione no `package.json`:
```json
"dev": "next dev -p 3005 -H 0.0.0.0"
```

### Passo 4: Acessar no iPhone

1. **Certifique-se que iPhone e PC estão na mesma WiFi**
2. **No iPhone Safari**, digite:
   ```
   http://SEU-IP:3005
   ```
   Exemplo: `http://192.168.1.100:3005`

3. **Aguarde carregar** (pode demorar alguns segundos na primeira vez)

---

## 🌐 Método 2: Testar Versão Online (Vercel)

### Mais Fácil e Recomendado!

1. **Faça deploy no Vercel** (veja `DEPLOY_VERCEL.md`)
2. **Acesse o link do Vercel no iPhone Safari**
3. **Teste todas as funcionalidades**

**Vantagens:**
- ✅ Funciona de qualquer lugar (não precisa mesma WiFi)
- ✅ Mais rápido (CDN do Vercel)
- ✅ Testa versão de produção real

---

## 📱 Testes Específicos para iPhone Safari

### 1. Testar Swipe (Abrir/Fechar Sidebar)
- ✅ Deslize da esquerda para direita → Sidebar deve abrir
- ✅ Deslize da direita para esquerda → Sidebar deve fechar

### 2. Testar Input Fixo
- ✅ Abra o chat
- ✅ Toque no campo de texto
- ✅ O teclado deve aparecer e o input **NÃO deve esconder**
- ✅ Digite uma mensagem
- ✅ Envie

### 3. Testar Área de Toque
- ✅ Todos os botões devem ser fáceis de tocar (não muito pequenos)
- ✅ Botões devem responder ao toque imediatamente

### 4. Testar PIN Pad
- ✅ Clique duas vezes na data/hora OU no botão "Fale Conosco"
- ✅ Digite o PIN (padrão: `1234`)
- ✅ Mensagens devem aparecer

### 5. Testar Auto-Lock
- ✅ Entre nas mensagens
- ✅ Saia do Safari (home button) ou troque de app
- ✅ Aguarde 10 segundos
- ✅ Volte ao Safari
- ✅ Deve voltar para tela de notícias automaticamente

### 6. Testar Notificações
- ✅ Envie uma mensagem de outro usuário
- ✅ Notificação deve aparecer como manchete de notícia
- ✅ Deve ter badge "BREAKING"

### 7. Testar Upload de Mídia
- ✅ Toque no botão de anexo (📎)
- ✅ Escolha Foto/Vídeo/Áudio
- ✅ Envie
- ✅ Verifique se aparece no chat

### 8. Testar PWA (Adicionar à Tela Inicial)
- ✅ No Safari, toque no botão "Compartilhar" (quadrado com seta)
- ✅ Toque em "Adicionar à Tela de Início"
- ✅ Abra o app da tela inicial
- ✅ Deve abrir em modo standalone (sem barra do Safari)

---

## 🐛 Problemas Comuns

### Não Consegue Acessar Localmente

**Problema:** iPhone não encontra o servidor

**Soluções:**
1. ✅ Verifique se estão na mesma WiFi
2. ✅ Desative firewall temporariamente no Windows
3. ✅ Use o IP correto (não `localhost`)
4. ✅ Verifique se o servidor está rodando
5. ✅ Tente usar `http://` em vez de `https://`

### Safari Não Carrega

**Problema:** Página em branco ou erro

**Soluções:**
1. ✅ Limpe cache do Safari (Configurações > Safari > Limpar Histórico)
2. ✅ Tente em modo anônimo
3. ✅ Verifique console do servidor para erros
4. ✅ Verifique se todas as variáveis de ambiente estão configuradas

### Input Esconde com Teclado

**Problema:** Campo de texto some quando teclado abre

**Solução:**
- ✅ Já implementado `safe-area-inset-bottom` no código
- ✅ Se ainda acontecer, pode ser bug do Safari
- ✅ Tente rolar a página manualmente

### Swipe Não Funciona

**Problema:** Não consegue abrir sidebar com swipe

**Soluções:**
1. ✅ Verifique se está em modo mobile (não desktop)
2. ✅ Tente deslizar mais devagar
3. ✅ Use o botão de menu se necessário

---

## ✅ Checklist de Testes

- [ ] App carrega no Safari
- [ ] Notícias aparecem corretamente
- [ ] Swipe funciona (abrir/fechar sidebar)
- [ ] PIN pad funciona
- [ ] Mensagens aparecem
- [ ] Input não esconde com teclado
- [ ] Upload de mídia funciona
- [ ] Notificações aparecem
- [ ] Auto-lock funciona (10 segundos)
- [ ] PWA pode ser adicionado à tela inicial
- [ ] Design responsivo funciona bem

---

## 🎉 Pronto!

Agora você pode testar tudo no seu iPhone Safari! 📱✨
