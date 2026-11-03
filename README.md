# Repositorios API — reto DevOps Easysoft

API Node.js del catálogo. Expone `GET /health`, `GET /healthz` y `GET /api/repositorios` en el puerto 3000.

## Validación local

```powershell
npm ci
npm run test:coverage
npm start
```

El reporte para SonarQube Cloud se genera en `coverage/lcov.info`.

## Configuración de GitHub y SonarQube Cloud

El workflow `.github/workflows/ci.yml` ejecuta pruebas, cobertura, análisis Sonar y una construcción Docker. En GitHub configura:

- Secret de Actions: `SONAR_TOKEN`.
- Variable de Actions: `SONAR_ORGANIZATION`.
- Variable de Actions: `SONAR_PROJECT_KEY`.

Mientras falte alguno, únicamente se omite Sonar; las demás verificaciones siguen funcionando.

## Minikube

```powershell
minikube image build -t repos-api:1.0 .
helm upgrade --install repos-api ./helm -n reto --create-namespace
kubectl get pods,svc -n reto
```
