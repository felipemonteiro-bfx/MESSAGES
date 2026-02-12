# 🔄 Como Trocar o Repositório Git

## 📋 Instruções

### Opção 1: Remover e Adicionar Novo Remote

```bash
# Remover o remote atual
git remote remove origin

# Adicionar novo remote (substitua pela URL do seu novo repositório)
git remote add origin https://github.com/SEU-USUARIO/NOVO-REPOSITORIO.git

# Verificar
git remote -v

# Fazer push para o novo repositório
git push -u origin staging
```

### Opção 2: Alterar URL do Remote Existente

```bash
# Alterar URL do remote
git remote set-url origin https://github.com/SEU-USUARIO/NOVO-REPOSITORIO.git

# Verificar
git remote -v

# Fazer push
git push -u origin staging
```

## ⚠️ Importante

- Certifique-se de que o novo repositório existe no GitHub/GitLab
- Se o repositório estiver vazio, você pode precisar usar `git push -u origin staging --force` (cuidado!)
- Todas as branches serão enviadas para o novo repositório

## 📝 Próximos Passos

1. Informe a URL do novo repositório
2. Executarei os comandos para você
3. Faremos o push das mudanças
