#!/usr/bin/env node
import axios from "axios";
import inquirer from "inquirer";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// --- Arguments CLI (optionnel pour le mode interactif)
const argv = yargs(hideBin(process.argv))
  .option("player", {
    alias: "p",
    type: "string",
    description: "Nom du Pokémon du joueur (optionnel, sinon choix interactif)",
  })
  .help()
  .parse();

const API = "https://pokeapi.co/api/v2/pokemon/";
const MAX_MOVES = 5;
const START_HP = 300;

// Liste de Pokémon populaires pour le choix
const POKEMON_CHOICES = [
  "pikachu",
  "charizard",
  "blastoise",
  "venusaur",
  "mewtwo",
  "gengar",
  "dragonite",
  "alakazam",
  "snorlax",
  "eevee"
];

// --- Fonction pour récupérer les infos d'un Pokémon
async function getPokemon(name) {
  const res = await axios.get(API + name.toLowerCase());
  return res.data;
}

// --- Fonction pour récupérer les 5 moves
async function getFiveMoves(pokemon) {
  // Mélanger les moves et en prendre 20 au hasard
  const shuffled = pokemon.moves.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 20); // on prend 20 max pour filtrer ensuite
  const moves = [];

  for (const move of selected) {
    try {
      const data = (await axios.get(move.move.url)).data;
      // Garder seulement les attaques avec power
      if (data.power) {
        moves.push({
          name: data.name,
          power: data.power,
          accuracy: data.accuracy ?? 100,
        });
      }
    } catch (err) {
      continue;
    }
    // Arrêter quand on a 5 attaques
    if (moves.length === MAX_MOVES) break;
  }

  // Si pas assez de moves valides
  while (moves.length < MAX_MOVES) {
    moves.push({ name: "tackle", power: 40, accuracy: 100 });
  }

  return moves;
}

// --- Fonction de combat
async function battle(playerName, botName) {
  // Récupérer les données des 2 pokémons
  const player = await getPokemon(playerName);
  const bot = await getPokemon(botName);
  // Récupérer leurs 5 attaques
  const playerMoves = await getFiveMoves(player);
  const botMoves = await getFiveMoves(bot);
  // Afficher le début du combat
  console.log(`\n⚔️  ${playerName.toUpperCase()} vs ${botName.toUpperCase()} ⚔️`);
  console.log("Each has 300 HP. First to 0 loses!\n");
  // Initialiser les HP
  let hpPlayer = START_HP;
  let hpBot = START_HP;
  // Boucle de combat
  let round = 1;
  while (hpPlayer > 0 && hpBot > 0) {
    console.log(`\nVotre HP: ${hpPlayer} | Bot HP: ${hpBot}`);
    
    // Player attack - CHOIX INTERACTIF
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "moveIndex",
        message: `Quel coup pour ${playerName} ?`,
        choices: playerMoves.map((move, i) => ({
          name: `${move.name} (P:${move.power}, A:${move.accuracy})`,
          value: i
        }))
      }
    ]);

    const moveP = playerMoves[answer.moveIndex];
    
    // Vérifier si l'attaque touche
    if (Math.random() * 100 <= moveP.accuracy) {
      hpBot -= moveP.power;
      console.log(`${playerName} utilise ${moveP.name} et inflige ${moveP.power} dégâts !`);
    } else {
      console.log(`${playerName} rate son attaque !`);
    }

    if (hpBot <= 0) break;

    // Bot attack
    const moveB = botMoves[Math.floor(Math.random() * botMoves.length)];
    if (Math.random() * 100 <= moveB.accuracy) {
      hpPlayer -= moveB.power;
      console.log(`${botName} utilise ${moveB.name} et inflige ${moveB.power} dégâts !`);
    } else {
      console.log(`${botName} rate son attaque !`);
    }

    round++;
  }

  console.log(`\nHP Final: ${playerName}=${Math.max(hpPlayer, 0)} | ${botName}=${Math.max(hpBot, 0)}\n`);

  if (hpPlayer <= 0 && hpBot <= 0) console.log("It's a draw!");
  else if (hpPlayer <= 0) console.log(`💀 ${playerName} a perdu! ${botName} gagne!`);
  else console.log(`� ${playerName} gagne!`);
}

// --- Lancer le jeu ---
(async () => {
  console.log("🎮 Bienvenue dans le combat Pokémon !");
  
  let playerName;

  // Si --player fourni, l'utiliser, sinon demander avec inquirer
  if (argv.player) {
    playerName = argv.player;
  } else {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "pokemon",
        message: "Choisissez votre Pokémon :",
        choices: POKEMON_CHOICES,
      },
    ]);
    playerName = answer.pokemon;
  }

  // Choisir un Pokémon au hasard pour le bot
  const randomId = Math.floor(Math.random() * 151) + 1;
  const botData = await axios.get(API + randomId);
  const botName = botData.data.name;
  
  console.log(`Le bot choisit ${botName} !`);

  await battle(playerName, botName);
})();