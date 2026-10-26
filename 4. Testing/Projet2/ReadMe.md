# Tests Unitaires du Smart Contract **Voting**

Ce dépôt contient la suite de tests unitaires écrite en **TypeScript** pour le contrat intelligent de vote (`Voting`). Ces tests s'appuient sur le framework **Hardhat**, la bibliothèque d'assertion **Chai**, et **Ethers.js** pour simuler et valider le comportement du protocole de vote.

## Vue d'ensemble du Contrat

Le contrat gère un processus de vote sécurisé et séquentiel divisé en plusieurs étapes clés (`WorkflowStatus`) :  
0. **RegisteringVoters** : Enregistrement des électeurs par l'owner.
1. **ProposalsRegistrationStarted** : Début de l'enregistrement des propositions.
2. **ProposalsRegistrationEnded** : Fin de l'enregistrement des propositions.
3. **VotingSessionStarted** : Début de la session de vote.
4. **VotingSessionEnded** : Fin de la session de vote.
5. **VotesTallied** : Comptabilisation et annonce des votes.

## Architecture des Tests

Pour optimiser la lisibilité et éviter la duplication de code, les tests utilisent des fonctions d'initialisation (*fixtures*) qui préparent l'état de la blockchain :

*   `deployVoting()` : Déploie le contrat à blanc, récupère l'owner et plusieurs comptes de test (`voter1`, `voter2`, etc.). Vérifie l'état initial.
*   `deployWithRegisteredVoters()` : Déploie le contrat et y inscrit automatiquement 3 électeurs (`voter1`, `voter2`, `voter3`).
*   `deployWithRegistredProposition()` : Déploie le contrat, inscrit les électeurs, ouvre la session de propositions, enregistre la "Proposition A", ferme la session et ouvre la session de vote finale.

## Contenu des Tests

Les tests sont regroupés par contextes fonctionnels (`describe`) :

*   **Deployment** : Vérifie la bonne initialisation du contrat (adresse de l'owner et statut initial à `RegisteringVoters`).
*   **Voters Registration** : Valide que seul l'owner peut ajouter des électeurs et que l'événement d'inscription est correctement émis, Doit permettre au propriétaire d'ajouter un votant et d'émettre l'événement, doit rejeter l'ajout si le votant est déjà inscrit, doit rejeter l'ajout si le WorkflowStatus n'est pas RegisteringVoters
*   **Proposals** : Doit rejeter les propositions si la session n’est pas ouverte, ne doit pas permettre à une personne qui n’est pas propriétaire d’inscrire un électeur, doit refuser une proposition vide, doit permettre à un électeur inscrit d’ajouter une proposition valide
* **Voting session** : Doit interdire le vote aux personnes non inscrites, doit enregistrer correctement le vote et incrémenter le compteur, doit interdire de voter deux fois, doit rejeter le vote portant sur une proposition inexistante
* **Vote tallying** : Doit identifier le véritable vainqueur après le vote.

## Lancement des Tests

Pour lancer les tests unitaires via Hardhat, exécutez la commande suivante dans votre terminal :

```bash
npx hardhat test ./test/Voting.ts
```

