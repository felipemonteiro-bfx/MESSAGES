# 💡 15 Sugestões de Melhorias – Stealth Messaging

Documento com sugestões práticas e relevantes para melhorar o app, considerando segurança, UX, funcionalidade e o conceito stealth.

---

## 🔐 Segurança e Privacidade

### 1. **"Esqueci o PIN" com recuperação via login**
**Problema:** Se o usuário esquecer o PIN, precisa limpar `localStorage` manualmente.  
**Solução:** Botão discreto "Esqueci o PIN" no PinPad que:
- Abre modal de login (email/senha)
- Após autenticar com sucesso, permite redefinir o PIN
- Mantém o fluxo stealth (não revela que é app de mensagens)
- Opcional: logar eventos de recuperação de PIN

**Prioridade:** 🔴 Alta  
**Esforço:** Médio  
**Impacto:** Melhora muito a experiência do usuário

---

### 2. **Criptografia de ponta a ponta (E2E) para mensagens**
**Problema:** Mensagens são armazenadas em texto plano no Supabase (mesmo com RLS).  
**Solução:** Implementar criptografia E2E usando Web Crypto API:
- Gerar par de chaves por usuário (armazenar privada criptografada com PIN)
- Criptografar mensagens antes de enviar ao Supabase
- Descriptografar ao receber (apenas quem tem a chave privada)
- Manter mídia opcionalmente criptografada também

**Prioridade:** 🟡 Média  
**Esforço:** Alto  
**Impacto:** Segurança máxima para comunicações sensíveis

---

### 3. **Modo "Incógnito" com auto-delete de mensagens**
**Problema:** Mensagens ficam salvas mesmo após sair do chat.  
**Solução:** Toggle "Modo Incógnito" que:
- Apaga mensagens locais ao fechar o chat
- Não salva histórico no navegador
- Opcionalmente: marca mensagens como efêmeras no banco (auto-delete após X horas)
- Visual diferente (banner discreto indicando modo ativo)

**Prioridade:** 🟡 Média  
**Esforço:** Médio  
**Impacto:** Privacidade adicional para conversas sensíveis

---

## 🎨 Experiência do Usuário (UX)

### 4. **Modo escuro opcional no portal de notícias**
**Problema:** Portal sempre em modo claro pode incomodar em ambientes escuros.  
**Solução:** 
- Toggle no menu lateral: "Tema escuro"
- Salvar preferência em `localStorage`
- Aplicar tema escuro no portal (mantém chat escuro como está)
- Transição suave entre temas

**Prioridade:** 🟡 Média  
**Esforço:** Baixo  
**Impacto:** Melhora conforto visual e parece app mais completo

---

### 5. **Tempo de auto-lock configurável**
**Problema:** Auto-lock fixo em 10 segundos pode ser muito curto ou muito longo.  
**Solução:** Opção no menu lateral:
- "Bloquear após: 10s / 30s / 1min / 5min / Nunca"
- Salvar em `localStorage`
- Aplicar imediatamente após mudança
- Mostrar contador visual quando próximo do lock

**Prioridade:** 🟡 Média  
**Esforço:** Baixo  
**Impacto:** Flexibilidade para diferentes necessidades de segurança

---

### 6. **Vibração/haptic feedback ao digitar PIN (mobile)**
**Problema:** Em mobile, feedback tátil melhora confiança ao digitar.  
**Solução:**
- `navigator.vibrate(10)` ao pressionar cada dígito do PIN
- Opcional: toggle "Vibração no PIN" nas configurações
- Verificar se API está disponível antes de usar

**Prioridade:** 🟢 Baixa  
**Esforço:** Baixo  
**Impacto:** Melhora experiência mobile

---

### 7. **Indicador de digitação ("digitando...")**
**Problema:** Não há feedback visual quando alguém está digitando.  
**Solução:**
- Usar Supabase Realtime para detectar quando usuário está digitando
- Mostrar "João está digitando..." abaixo do campo de mensagem
- Timeout de 3 segundos após parar de digitar
- Opcional: som discreto quando alguém começa a digitar

**Prioridade:** 🟡 Média  
**Esforço:** Médio  
**Impacto:** Melhora sensação de presença em tempo real

---

### 8. **Busca dentro de conversas**
**Problema:** Não há como buscar mensagens antigas em uma conversa.  
**Solução:**
- Botão de busca no header do chat
- Campo de busca que filtra mensagens por texto
- Highlight dos resultados
- Navegação entre resultados (próximo/anterior)
- Busca também em mídia (por nome de arquivo ou descrição)

**Prioridade:** 🟡 Média  
**Esforço:** Médio  
**Impacto:** Útil para encontrar informações antigas

---

## 📱 Funcionalidades Avançadas

### 9. **Compartilhamento de localização (opcional)**
**Problema:** Às vezes é útil compartilhar onde você está.  
**Solução:**
- Botão "Compartilhar localização" no chat
- Usar Geolocation API do navegador
- Enviar como mensagem especial com mapa (Google Maps ou OpenStreetMap)
- Opção de compartilhar uma vez ou continuamente por X minutos
- Visual discreto (não revela que é app de mensagens)

**Prioridade:** 🟢 Baixa  
**Esforço:** Médio  
**Impacto:** Funcionalidade útil para alguns casos de uso

---

### 10. **Mensagens com timer (auto-delete após X tempo)**
**Problema:** Mensagens efêmeras existem, mas não há controle fino por mensagem.  
**Solução:**
- Ao enviar mensagem, opção: "Auto-deletar após: 1min / 5min / 1h / 24h"
- Timer visual na mensagem (se ainda não deletou)
- Notificação quando mensagem está prestes a ser deletada
- Funciona mesmo se usuário não estiver online

**Prioridade:** 🟡 Média  
**Esforço:** Médio  
**Impacto:** Controle fino sobre privacidade de mensagens

---

### 11. **Arquivar conversas**
**Problema:** Conversas antigas ficam na lista principal.  
**Solução:**
- Botão "Arquivar" em cada conversa
- Seção "Arquivadas" no menu lateral
- Desarquivar quando receber nova mensagem
- Opcional: auto-arquivar após X dias sem mensagens

**Prioridade:** 🟢 Baixa  
**Esforço:** Baixo  
**Impacto:** Organização melhor das conversas

---

### 12. **Notificações silenciosas por conversa**
**Problema:** Não há como silenciar notificações de conversas específicas.  
**Solução:**
- Ícone de sino em cada conversa
- Toggle "Silenciar notificações" (salvar em `chat_participants`)
- Visual diferente para conversas silenciadas
- Opcional: ainda mostrar notificação se mencionar o usuário

**Prioridade:** 🟡 Média  
**Esforço:** Baixo  
**Impacto:** Controle sobre notificações

---

## 🔧 Melhorias Técnicas

### 13. **SEO e meta tags para compartilhamento**
**Problema:** Links compartilhados podem exibir título/descrição genéricos.  
**Solução:**
- Adicionar `metadata` no layout principal:
  - `openGraph` (og:title, og:description, og:image)
  - `twitter:card`
  - Imagem genérica de notícias para compartilhamento
- Meta tags dinâmicas por página (se aplicável)

**Prioridade:** 🟢 Baixa  
**Esforço:** Baixo  
**Impacto:** Site parece mais profissional quando compartilhado

---

### 14. **Página 404 customizada no estilo do portal**
**Problema:** Erro 404 padrão do Next.js pode revelar que não é só portal de notícias.  
**Solução:**
- Criar `not-found.tsx` customizado
- Layout igual ao portal de notícias
- Mensagem: "Página não encontrada" com link para home
- Manter disfarce de portal de notícias

**Prioridade:** 🟢 Baixa  
**Esforço:** Baixo  
**Impacto:** Mantém o disfarce mesmo em erros

---

### 15. **Otimização de performance: lazy loading de imagens e mensagens**
**Problema:** Carregar todas as mensagens e imagens pode ser lento em conversas grandes.  
**Solução:**
- Lazy loading de mensagens antigas (carregar ao scrollar para cima)
- Lazy loading de imagens (usar `loading="lazy"` ou Intersection Observer)
- Virtualização da lista de mensagens (react-window ou similar)
- Cache de imagens em `IndexedDB` para acesso offline

**Prioridade:** 🟡 Média  
**Esforço:** Médio-Alto  
**Impacto:** Melhora performance em conversas grandes

---

## 📊 Resumo de Priorização

| Prioridade | Sugestão | Esforço | Impacto |
|------------|----------|---------|---------|
| 🔴 Alta | 1. Esqueci o PIN | Médio | Alto |
| 🟡 Média | 2. Criptografia E2E | Alto | Muito Alto |
| 🟡 Média | 3. Modo Incógnito | Médio | Médio |
| 🟡 Média | 4. Modo escuro | Baixo | Médio |
| 🟡 Média | 5. Auto-lock configurável | Baixo | Médio |
| 🟢 Baixa | 6. Vibração no PIN | Baixo | Baixo |
| 🟡 Média | 7. Indicador de digitação | Médio | Médio |
| 🟡 Média | 8. Busca em conversas | Médio | Médio |
| 🟢 Baixa | 9. Compartilhar localização | Médio | Baixo |
| 🟡 Média | 10. Mensagens com timer | Médio | Médio |
| 🟢 Baixa | 11. Arquivar conversas | Baixo | Baixo |
| 🟡 Média | 12. Silenciar conversas | Baixo | Médio |
| 🟢 Baixa | 13. SEO/meta tags | Baixo | Baixo |
| 🟢 Baixa | 14. 404 customizado | Baixo | Baixo |
| 🟡 Média | 15. Otimização performance | Médio-Alto | Alto |

---

## 🎯 Recomendações Imediatas

Para implementar primeiro (maior impacto/esforço):

1. **Esqueci o PIN** (🔴 Alta) - Resolve problema comum
2. **Modo escuro** (🟡 Média) - Fácil e melhora UX
3. **Auto-lock configurável** (🟡 Média) - Fácil e útil
4. **Silenciar conversas** (🟡 Média) - Fácil e muito útil
5. **Busca em conversas** (🟡 Média) - Útil para conversas longas

---

## 📝 Notas

- Todas as sugestões mantêm o conceito stealth (não revelam que é app de mensagens)
- Priorizar segurança e privacidade em primeiro lugar
- UX melhorias têm impacto direto na satisfação do usuário
- Funcionalidades avançadas podem ser implementadas conforme necessidade

---

**Última atualização:** 2026-02-13
