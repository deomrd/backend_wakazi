# Exploitation du backend Wakazi

Ce guide couvre les points obligatoires avant une mise en production du MVP Express + MySQL.

## Variables de production

- `NODE_ENV=production`
- `DATABASE_URL=mysql://...` vers un compte MySQL dedie, sans droit d'administration global
- `JWT_SECRET` aleatoire d'au moins 32 caracteres
- `PORT`, `TRUST_PROXY_HOPS`, `READINESS_TIMEOUT_MS` et `SHUTDOWN_TIMEOUT_MS` selon l'hebergeur
- HTTPS termine par un reverse proxy de confiance ; ne jamais exposer directement MySQL sur Internet

Ne jamais commiter `.env`. La configuration de reference se trouve dans `.env.example`.

## Controle avant deploiement

```powershell
npm ci
npm run db:generate
npm run backend:preflight
npm run test:e2e:mysql
```

Le test E2E recree exclusivement une base dont le nom se termine par `_e2e`. Il ne touche pas a la base applicative.

## Sauvegarde et verification

Avant toute migration ou mise a jour :

```powershell
npm run db:backup
npm run db:backup:verify
```

Chaque dump recoit un fichier `.sha256`. Les sauvegardes locales de plus de 30 jours sont supprimees par defaut. En production, copier les dumps chiffres vers un stockage externe avec une politique de retention.

## Deploiement et mise a jour

1. Faire et verifier une sauvegarde.
2. Installer les dependances verrouillees avec `npm ci`.
3. Executer `npx prisma generate` puis `npx prisma migrate deploy`.
4. Executer `npx prisma db seed` pour garantir les roles obligatoires.
5. Executer `npm run backend:preflight` puis `npm run build`.
6. Redemarrer le service avec le gestionnaire de processus de l'hebergeur.
7. Verifier `/api/health/live` puis `/api/health/ready`.

Une mise a jour ne doit pas utiliser `prisma migrate dev` en production.

## Restauration

La restauration exige deux fois le nom exact de la base cible :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restore-mysql.ps1 `
  -BackupPath backups/wakazi-AAAAMMJJ-HHMMSS.sql `
  -TargetDatabase wakazi_restore_test `
  -ConfirmDatabaseName wakazi_restore_test `
  -RecreateDatabase
```

Tester d'abord la restauration dans une base separee, lancer les controles, puis planifier la restauration de production pendant une fenetre de maintenance.

Verifier le contenu restaure :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-restore.ps1 `
  -TargetDatabase wakazi_restore_test
```

## Supervision minimale

- Alerter si `/api/health/ready` renvoie `503`.
- Centraliser les logs avec leur `requestId` sans journaliser PIN, JWT ou URL MySQL.
- Surveiller CPU, memoire, espace disque, connexions MySQL et taux de reponses `5xx`.
- Tester periodiquement une restauration complete ; un dump jamais restaure n'est pas une sauvegarde prouvee.
