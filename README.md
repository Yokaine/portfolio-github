# Portfolio GitHub

Application web qui transforme un profil GitHub public en portfolio partageable.

## Membres du projet

- Ayman EL HARI

## Application déployée

[https://yokaine.github.io/portfolio-github/]

## Fonctionnalités

- Recherche d'un profil GitHub par pseudo, avec vérification de son existence
- Affichage de l'avatar, du nom, de la biographie et du lien vers le profil
- Affichage des dépôts publics sous forme de cartes (nom, description, langage, lien vers le code, lien de démo si renseigné)
- Exclusion des forks par défaut, avec option pour les inclure
- Tri des dépôts du plus récemment mis à jour au plus ancien
- Filtrage par langage
- URL partageable (`?user=pseudo`)
- Mise en avant de projets, partageable via l'URL (`&featured=repo1,repo2`)
- Thème clair / sombre, choix conservé dans l'URL (`&theme=dark`)
- Couleur d'accent générée automatiquement à partir du pseudo recherché
- Gestion des états : chargement, pseudo inexistant, liste vide, erreur réseau, quota d'API dépassé
- Mode démo fonctionnant sans appel à l'API GitHub, avec plusieurs langages et tous les cas d'erreur
- Export du portfolio en page HTML autonome, téléchargeable
- Interface responsive (mobile et ordinateur)

## Stack technique

- Symfony 7 / PHP 8.3 (sert la page, aucune logique métier côté serveur)
- JavaScript natif (appels à l'API GitHub, affichage, filtres, état de l'application)
- Docker (environnement de développement)
- API REST publique de GitHub

## Installation et lancement en local

### Prérequis

- Docker et Docker Compose installés

### Étapes

1. Cloner le dépôt :
   
   git clone https://github.com/Yokaine/portfolio-github.git
   cd portfolio-github


2. Construire et démarrer le conteneur :
  
   docker compose build
   docker compose up

3. Ouvrir [http://localhost:8000] dans un navigateur.

## Mode démo

L'application peut fonctionner sans aucun appel à l'API GitHub, à l'aide de fichiers JSON versionnés dans `public/demo/`.

Pour l'activer : cocher la case **« Mode démo »** sur la page, puis utiliser l'un des pseudos suivants :

| Pseudo | Comportement simulé |
| `demo-user` | Profil avec plusieurs dépôts (plusieurs langages, un fork, un dépôt sans description) |
| `empty-user` | Profil valide sans aucun dépôt public |
| `notfound-user` | Pseudo inexistant |
| `quota-user` | Quota de l'API GitHub dépassé |
| `network-error-user` | Erreur réseau |

Le mode démo peut aussi être activé directement via l'URL : `?user=demo-user&demo=1`.

## Vérifications automatisées (CI)

Une GitHub Action (`.github/workflows/ci.yml`) se déclenche automatiquement à chaque pull request vers la branche `develop`. Elle exécute :

- Un lint de syntaxe PHP
- Une vérification de la configuration Symfony (`lint:container`)
- Un lint des templates Twig (`lint:twig`)
- Une validation des fichiers JSON du mode démo

Le résultat est visible dans l'onglet **Actions** du dépôt et directement dans chaque pull request.

## Déploiement

Le site est déployé sur GitHub Pages, en version statique (HTML/CSS/JS), à partir du dossier `docs/` de la branche `main`. Cette version est fonctionnellement identique à l'application Symfony, toute la logique étant déjà exécutée côté navigateur.