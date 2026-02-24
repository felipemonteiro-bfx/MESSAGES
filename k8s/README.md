# Deploy no Kubernetes (MicroK8s)

## 1. Criar o Secret com as variáveis de ambiente

```bash
# Copiar o exemplo e editar com seus valores
cp k8s/secret.yaml.example k8s/secret.yaml

# Edite k8s/secret.yaml e preencha:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_NEWS_API_KEY (opcional)
```

Ou criar o secret direto a partir do `.env.local` (no PowerShell):

```powershell
cd c:\Users\Administrador\stealth-messaging
kubectl create namespace stealth-messaging --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic stealth-messaging-env --from-env-file=.env.local -n stealth-messaging --dry-run=client -o yaml | kubectl apply -f -
```

(Se faltar alguma chave no .env.local, crie o secret manualmente a partir do `secret.yaml.example`.)

## 2. Build da imagem e carregar no cluster (MicroK8s)

**Opção A – Imagem local (sem registry):**

```powershell
# Build
docker build -t stealth-messaging:latest .

# Importar no MicroK8s (no host do cluster, ou com docker save/load se for remoto)
# No Linux com MicroK8s:
# microk8s ctr image import $(docker save stealth-messaging:latest | gzip | base64 -w0)
# Ou salvar e carregar manualmente:
docker save stealth-messaging:latest -o stealth-messaging.tar
# No node do cluster:
# microk8s ctr image import stealth-messaging.tar
```

**Opção B – Registry (recomendado para produção):**

```powershell
docker build -t seu-registry.com/stealth-messaging:latest .
docker push seu-registry.com/stealth-messaging:latest
# Em deployment.yaml troque image para: seu-registry.com/stealth-messaging:latest
# e imagePullPolicy: Always
```

No Windows, se o cluster está em outra máquina (ex.: 192.168.150.200), use um registry acessível ou push para Docker Hub e altere a imagem no deployment.

## 3. Aplicar os manifestos

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

Ou de uma vez:

```bash
kubectl apply -f k8s/
```

## 4. Verificar

```bash
kubectl get pods -n stealth-messaging
kubectl get svc -n stealth-messaging
kubectl logs -f deployment/stealth-messaging -n stealth-messaging
```

## 5. Acessar o app

- **Sem Ingress:** use `kubectl port-forward svc/stealth-messaging 3000:80 -n stealth-messaging` e abra http://localhost:3000
- **Com Ingress:** configure o host (ex.: `stealth-messaging.local`) no DNS ou `/etc/hosts` apontando para o IP do ingress controller e acesse http://stealth-messaging.local

## Ingress no MicroK8s

Se usar o addon ingress do MicroK8s:

```bash
microk8s enable ingress
```

O `ingressClassName` em `ingress.yaml` pode precisar ser ajustado (ex.: `public` no MicroK8s). Edite `k8s/ingress.yaml` conforme o seu ambiente.
