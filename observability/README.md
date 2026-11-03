# Observabilidad local — Prometheus y Grafana

Este directorio instala `kube-prometheus-stack` dentro de Minikube. No requiere instalar Prometheus ni Grafana en Windows.

## Instalar

```powershell
helm upgrade --install monitoring oci://ghcr.io/prometheus-community/charts/kube-prometheus-stack `
  --version 92.17.1 `
  --namespace monitoring `
  --create-namespace `
  --values .\observability\values.yaml `
  --wait --timeout 10m

kubectl apply -n monitoring -f .\observability\dashboard-easysoft.yaml
helm upgrade --install repos-api .\helm -n reto
```

## Abrir Grafana

```powershell
kubectl port-forward -n monitoring svc/monitoring-grafana 3001:80

$grafanaPassword = kubectl get secret -n monitoring monitoring-grafana -o jsonpath="{.data.admin-password}"
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($grafanaPassword))
```

Abre `http://localhost:3001` e inicia sesión con usuario `admin` y la contraseña devuelta por el segundo comando. La contraseña permanece en un `Secret` de Kubernetes y no se guarda en el código. El tablero se encuentra en **Dashboards → Easysoft API Observability**.

## Verificar Prometheus

```powershell
kubectl get pods -n monitoring
kubectl get servicemonitor -n reto
kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-prometheus 9090:9090
```

En `http://localhost:9090/targets`, el target `serviceMonitor/reto/repos-api` debe aparecer como `UP`.
