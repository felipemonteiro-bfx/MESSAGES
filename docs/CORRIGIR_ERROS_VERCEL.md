# 🔧 Corrigir Erros no Vercel

## Erros Encontrados e Soluções

### ✅ 1. React Error #418 (Hydration Mismatch) - CORRIGIDO

**Erro:**
```
Uncaught Error: Minified React error #418
```

**Causa:** HTML renderizado no servidor não corresponde ao HTML renderizado no cliente.

**Solução Aplicada:**
- ✅ Adicionado `suppressHydrationWarning` no elemento que exibe data
- ✅ Substituído `Math.random()` por hash determinístico baseado no conteúdo
- ✅ `Date.now()` agora só é usado no cliente (com `typeof window` check)

**Status:** ✅ Corrigido no código

---

### ✅ 2. Ícone do Manifest Não Encontrado - VERIFICAR

**Erro:**
```
Error while trying to use the following icon from the Manifest: 
https://stealth-messaging.vercel.app/icon-192.svg 
(Download error or resource isn't a valid image)
```

**Solução:**

1. **Verificar se o arquivo existe:**
   - O arquivo `public/icon-192.svg` existe no projeto
   - Verifique se está sendo copiado no build

2. **Verificar build do Vercel:**
   - Vá em **Vercel Dashboard** → **Deployments** → **Build Logs**
   - Procure por erros relacionados a `icon-192.svg`

3. **Se o arquivo não estiver sendo servido:**
   - Adicione ao `next.config.ts`:
   ```typescript
   // next.config.ts
   export default {
     // ... outras configs
     publicRuntimeConfig: {
       // Garantir que arquivos estáticos sejam servidos
     }
   }
   ```

4. **Alternativa: Converter SVG para PNG:**
   - Se SVG não funcionar, crie `icon-192.png` e `icon-512.png`
   - Atualize `manifest.json` para usar PNG

---

### ⚠️ 3. NewsAPI Error 426 (Upgrade Required) - TRATADO

**Erro:**
```
GET https://newsapi.org/v2/top-headlines?... 426 (Upgrade Required)
```

**Causa:** A chave da NewsAPI atingiu limite do plano gratuito ou expirou.

**Solução Aplicada:**
- ✅ Tratamento de erro 426 implementado
- ✅ App usa notícias mock quando NewsAPI falha
- ✅ Logs de warning em vez de erro fatal

**Ações Recomendadas:**

1. **Verificar chave da NewsAPI:**
   - Acesse: https://newsapi.org/account
   - Verifique se a chave está ativa
   - Verifique limites do plano

2. **Atualizar chave (se necessário):**
   - Vá em **Vercel** → **Settings** → **Environment Variables**
   - Atualize `NEXT_PUBLIC_NEWS_API_KEY`

3. **Alternativa: Usar outra API:**
   - Considerar usar outras APIs de notícias gratuitas
   - Ou usar apenas notícias mock (já implementado como fallback)

---

### ✅ 4. Imagem Unsplash 404 - CORRIGIDO

**Erro:**
```
GET https://images.unsplash.com/photo-1611974765270-ca1258634369?... 404 (Not Found)
```

**Causa:** Imagem foi removida do Unsplash.

**Solução Aplicada:**
- ✅ Substituída imagem quebrada por imagem válida
- ✅ `getDefaultImage()` agora usa imagem fixa em vez de aleatória

**Status:** ✅ Corrigido no código

---

## 🔍 Verificações Adicionais

### Verificar Build no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Deployments** → último deployment
4. Clique em **Build Logs**
5. Procure por erros ou warnings

### Verificar Variáveis de Ambiente

No Vercel Dashboard → Settings → Environment Variables, verifique:

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `NEXT_PUBLIC_NEWS_API_KEY` (opcional, app funciona sem ela)

### Verificar Arquivos Estáticos

Execute localmente:
```bash
npm run build
npm start
```

Acesse: http://localhost:3005/icon-192.svg

Se não carregar, o problema é no build. Se carregar localmente mas não no Vercel, pode ser configuração do Vercel.

---

## 🚀 Próximos Passos

1. ✅ **Código corrigido** - Mudanças commitadas
2. ⏳ **Aguardar novo deploy** no Vercel
3. 🔍 **Verificar logs** do novo deployment
4. ✅ **Testar** após deploy

---

## 📝 Notas

- O erro React #418 foi causado por valores não determinísticos (`Date.now()`, `Math.random()`)
- A NewsAPI pode estar com limite atingido - o app funciona sem ela usando notícias mock
- Os ícones SVG devem estar sendo servidos corretamente pelo Next.js

**Última atualização:** 2026-02-13
