# 📰 Como Configurar NewsAPI

## 🎯 Passo 1: Obter Chave da API

### Opção 1: NewsAPI.org (Recomendado - Gratuito)

1. **Acesse**: https://newsapi.org/register
2. **Crie uma conta gratuita**:
   - Email
   - Senha
   - Confirme o email
3. **Obtenha sua chave**:
   - Após login, vá em **API Keys**
   - Copie sua chave (formato: `abc123def456...`)

**Limites do Plano Gratuito:**
- ✅ 100 requisições por dia
- ✅ Apenas para desenvolvimento
- ⚠️ Não pode usar em produção comercial sem plano pago

### Opção 2: Alternativas Gratuitas

**NewsData.io** (Gratuito):
- Site: https://newsdata.io/
- 200 requisições/dia grátis
- Melhor para produção

**Currents API** (Gratuito):
- Site: https://currentsapi.services/
- 100 requisições/dia grátis

---

## 🔧 Passo 2: Configurar Localmente

### 1. Edite `.env.local`:

```env
# News API
NEXT_PUBLIC_NEWS_API_KEY=sua-chave-aqui
```

**Exemplo:**
```env
NEXT_PUBLIC_NEWS_API_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### 2. Reinicie o servidor:

```bash
# Pare o servidor (Ctrl+C)
# Inicie novamente
yarn dev
```

### 3. Teste:

1. Abra http://localhost:3005
2. Veja se as notícias reais aparecem (em vez das mock)
3. Verifique o console do navegador (F12) para erros

---

## 🌐 Passo 3: Configurar no Vercel

### 1. Acesse o Dashboard do Vercel:
- https://vercel.com/dashboard
- Selecione seu projeto `stealth-messaging`

### 2. Vá em Settings > Environment Variables:

### 3. Adicione a variável:

**Nome:** `NEXT_PUBLIC_NEWS_API_KEY`  
**Valor:** `sua-chave-da-newsapi`  
**Ambiente:** 
- ✅ Production
- ✅ Preview  
- ✅ Development

### 4. Salve e faça novo deploy:

- Vá em **Deployments**
- Clique em **Redeploy** no último deploy
- Ou faça um novo commit para trigger automático

---

## ✅ Verificar se Funcionou

### Localmente:
1. Abra http://localhost:3005
2. Veja se as notícias são reais (títulos diferentes das mock)
3. Verifique se há imagens reais das notícias

### No Vercel:
1. Acesse seu link do Vercel
2. Veja se as notícias são reais
3. Teste diferentes categorias

---

## 🐛 Troubleshooting

### Erro: "NewsAPI error"
- ✅ Verifique se a chave está correta
- ✅ Verifique se não excedeu o limite diário (100 requisições)
- ✅ Verifique se está usando `https://` na URL

### Notícias não aparecem:
- ✅ Verifique o console do navegador (F12)
- ✅ Verifique se a chave está no `.env.local`
- ✅ Reinicie o servidor após adicionar a chave

### Limite excedido:
- ⚠️ O plano gratuito tem limite de 100 requisições/dia
- 💡 Use notícias mock como fallback (já implementado)
- 💡 Considere upgrade para plano pago se necessário

---

## 📝 Nota Importante

**Para Produção:**
- ⚠️ NewsAPI.org gratuito **NÃO permite uso comercial**
- ✅ Use apenas para desenvolvimento/testes
- 💡 Para produção, considere:
  - NewsData.io (planos pagos)
  - Currents API (planos pagos)
  - Ou use apenas notícias mock (já funcionando)

---

## 🎉 Pronto!

Agora você tem notícias reais no seu app! 🚀
