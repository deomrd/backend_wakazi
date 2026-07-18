 Module Sign-Up (Wakazi Backend)
Ce module gère l'inscription des nouveaux utilisateurs (Propriétaires) et l'initialisation automatique de leur boutique. Il est conçu selon les principes de la Clean Architecture pour garantir la testabilité, la sécurité et la maintenabilité.

 Architecture du Module
 -----------------------
Le module est découpé en couches distinctes :

Domaine (/domaine) : Contient l'entité métier (SignupEntity) et l'interface du dépôt (SignupRepository). C'est le cœur du module, indépendant de toute technologie.
Application (/application) : Contient le cas d'utilisation (SignupUseCase). Il orchestre la logique métier : validation du format PIN, vérification des doublons et hachage sécurisé des mots de passe.
Infrastructure (/infrastructure) : Implémentation technique. Le PrismaSignupRepository gère l'accès aux données et utilise des transactions atomiques.
Présentation (/presentation) : Point d'entrée de l'API. Contient le SignupController, les routes Express et la validation de schéma avec Zod.
🚀 Fonctionnalités Clés
Atomicité garantie : Grâce aux transactions Prisma, la création de l'Utilisateur, de sa Boutique et l'assignation de son Rôle (PROPRIETAIRE) réussissent ou échouent ensemble. Aucune donnée orpheline n'est possible.
Sécurité renforcée :
Validation stricte du code PIN (exactement 4 chiffres).
Hachage des mots de passe via bcrypt (12 rounds).
Masquage automatique des hashs dans les réponses API.
Messages Centralisés : Tous les messages d'erreur et de succès proviennent de src/shared/ERROR_MESSAGES/, facilitant la maintenance et l'internationalisation.
🛠️ Installation & Pré-requis
1. Initialisation de la Base de Données
Le module nécessite que le rôle PROPRIETAIRE existe en base de données. Utilisez le script de seed fourni :

bash
npx prisma db seed
2. Variables d'environnement
Assurez-vous que votre fichier .env contient la variable DATABASE_URL valide.

🔌 API Endpoints
Les routes sont préfixées par /api/auth/signup (configurable dans app.ts).

Méthode	Endpoint	Description
POST	/create_account	Crée un compte propriétaire + sa boutique.

Les anciennes routes globales de lecture, modification et suppression des comptes ont été retirées afin de garantir l'isolation entre boutiques. La gestion des employés passe par `/api/employes`.
Exemple de Payload (Inscription)
json
 Show full code block 
{
  "nom": "Kambale Luendo",
  "telephone": "243812345678",
  "motDePasse": "8522",
  "nomBoutique": "Wakazi Store",
  "typeEntreprise": "QUINCAILLERIE",
  "adresseBoutique": "Goma, BD de l'UPN",
  "devise": "USD"
}
🛡️ Validation des données (Zod)
Le schéma signupSchema.ts valide les contraintes suivantes :

nom : Minimum 2 caractères.
telephone : Entre 9 et 15 chiffres.
motDePasse : Exactement 4 chiffres (^\d{4}$).
typeEntreprise : Doit correspondre à l'énumération Prisma TypeEntreprise.
📂 Structure des fichiers
text
 Show full code block 
modul_signUp/
├── domaine/
│   ├── entity/           # Définition des interfaces de données
│   └── repository/       # Interface du contrat de données
├── application/
│   └── usecase/          # Logique métier et orchestration
├── infrastructure/
│   └── prismaRepository/ # Implémentation Prisma (Transactions)
└── presentation/
    ├── controller/       # Gestion des requêtes/réponses HTTP
    ├── routes/           # Définition des routes Express
    └── validation_zod/   # Schémas de validation des entrées
Note pour les développeurs
Si vous modifiez la structure de la base de données dans schema.prisma, n'oubliez pas de régénérer le client Prisma avec npx prisma generate et de mettre à jour le mapper mapToEntity dans le repository si nécessaire.

## Modules prioritaires disponibles

- `/api/achats` : fournisseurs, achats transactionnels, réception en stock et dettes fournisseurs.
- `/api/inventaires` : comptage et ajustement transactionnel du stock.
- `/api/ventes/:id/annulation` : annulation contrôlée avec restitution du stock.
- `/api/ventes/:id/remboursements` : remboursements partiels ou complets.
- `/api/ventes/:id/recu` : reçu imprimable ou enregistrable en PDF depuis le navigateur.
- `/api/caisses` : caisses, sessions, mouvements, fermeture et validation.
- `/api/rapports/financier` : chiffre d'affaires, marge, bénéfice, créances, dettes et valeur du stock.

## Fondations de sécurité et d'exploitation

- Vérification du rôle et de la boutique en base à chaque requête authentifiée.
- Révocation des jetons après déconnexion, changement de PIN, changement de rôle ou désactivation.
- Limitation des tentatives de connexion et de création de compte.
- Identifiant `X-Request-Id`, logs HTTP structurés et headers de sécurité.
- `/api/health/live` pour la vie du processus et `/api/health/ready` pour la disponibilité MySQL.
- Arrêt propre du serveur et déconnexion Prisma sur `SIGINT`/`SIGTERM`.

Avant de lancer la nouvelle version sur une base existante :

```bash
npm install
npm run db:generate
npx prisma migrate deploy
npm run check
npm run dev
```

## Validation obligatoire du MVP backend

```powershell
npm run backend:preflight
npm run test:e2e:mysql
npm run db:backup
npm run db:backup:verify
```

Le parcours E2E utilise une base MySQL isolee se terminant par `_e2e`. Les procedures de deploiement, de sauvegarde et de restauration sont detaillees dans [docs/BACKEND_OPERATIONS.md](docs/BACKEND_OPERATIONS.md).

