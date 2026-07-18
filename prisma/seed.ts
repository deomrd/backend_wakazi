import { PrismaClient, RoleNom } from '@prisma/client';

/**
 * Instance du client Prisma pour interagir avec la base de données.
 */
const prisma = new PrismaClient();

/**
 * Fonction principale de "seeding" (peuplement de la base de données).
 * Ce script est conçu pour être idempotent : il peut être exécuté plusieurs fois
 * sans créer de doublons ni d'erreurs.
 */
async function main() {
  console.log('--- [SEED] Initialisation du peuplement des données ---');

  // Récupération automatique de tous les rôles définis dans l'énumération Prisma (schema.prisma).
  // Cela permet de synchroniser la base de données avec les types TypeScript.
  const roles = Object.values(RoleNom);

  console.log(`Log: Vérification de ${roles.length} rôles de sécurité.`);

  for (const role of roles) {
    /**
     * Utilisation de l'opération 'upsert' (Update or Insert) :
     * - where: On cherche si le rôle existe déjà par son nom unique.
     * - update: Si trouvé, on ne fait rien (objet vide).
     * - create: Si absent, on crée l'entrée avec le nom du rôle.
     */
    await prisma.role.upsert({
      where: { nom: role },
      update: {},
      create: { nom: role },
    });
  }

  console.log('--- [SEED] Succès : Les rôles obligatoires sont opérationnels ---');
}

/**
 * Point d'entrée du script.
 */
main()
  .catch((e) => {
    // En cas d'erreur, on affiche le log et on force la sortie du processus avec un code d'erreur (1).
    console.error('Erreur critique lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    // Fermeture de la connexion à la base de données pour libérer les ressources,
    // que le script ait réussi ou échoué.
    await prisma.$disconnect();
  });