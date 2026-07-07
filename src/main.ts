import { Application, Container, Graphics, Text } from "pixi.js";
import YAML from "yaml";
import "./style.css";
import gameYaml from "./game/flow-architect-teo-apartamento.game.yaml?raw";
import type { Actor, Condition, Dialogue, Effect, FlowGame, GameObject, Room, Scene } from "./types";

const game = YAML.parse(gameYaml) as FlowGame;

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Missing #app root.");
}

appRoot.innerHTML = `
  <main id="game-root"></main>
  <footer id="hud">
    <div id="hud-title"></div>
    <div id="hud-message"></div>
    <div id="hud-state"></div>
  </footer>
`;

const gameRoot = document.querySelector<HTMLDivElement>("#game-root")!;
const hudTitle = document.querySelector<HTMLDivElement>("#hud-title")!;
const hudMessage = document.querySelector<HTMLDivElement>("#hud-message")!;
const hudState = document.querySelector<HTMLDivElement>("#hud-state")!;

const scene = game.scenes[0];
const room = scene.rooms[0];
const player = game.world.characters.find((actor) => actor.id === "teo") ?? game.world.characters[0];
const state = new Map<string, unknown>();
const inventory = new Set<string>();
const keys = new Set<string>();

for (const stateVariable of game.world.global_state ?? []) {
  state.set(stateVariable.id, stateVariable.initial);
}

for (const object of game.objects) {
  for (const stateVariable of object.state ?? []) {
    state.set(stateVariable.id, stateVariable.initial);
  }
}

const app = new Application();
await app.init({
  background: "#121417",
  resizeTo: gameRoot,
  antialias: true
});

gameRoot.appendChild(app.canvas);

const world = new Container();
app.stage.addChild(world);

const playerSprite = new Graphics();
const objectSprites = new Map<string, Graphics>();

hudTitle.textContent = `${game.title} / ${scene.title}`;
setMessage("Use A/D ou setas para mover Teo. Clique nos objetos para interagir.");

drawRoom(room);
drawObjects(scene);
drawActor(player);
renderHudState();

window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

app.ticker.add((ticker) => {
  const speed = 220 * ticker.deltaTime / 60;
  const direction = Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a"));

  if (direction !== 0) {
    player.position.x = clamp(player.position.x + direction * speed, 240, 1660);
    playerSprite.x = player.position.x;
  }
});

function drawRoom(currentRoom: Room) {
  world.removeChildren();

  const scale = Math.min(app.screen.width / currentRoom.size.width, app.screen.height / currentRoom.size.height);
  world.scale.set(scale);
  world.x = (app.screen.width - currentRoom.size.width * scale) / 2;
  world.y = (app.screen.height - currentRoom.size.height * scale) / 2;

  const background = new Graphics()
    .rect(0, 0, currentRoom.size.width, currentRoom.size.height)
    .fill("#1d2329")
    .rect(120, 190, 1680, 710)
    .fill("#303946")
    .rect(650, 420, 320, 270)
    .fill("#3d4e56")
    .rect(1120, 500, 260, 230)
    .fill("#2a2f34")
    .rect(1380, 250, 260, 280)
    .fill("#253d4c");

  world.addChild(background);

  for (const area of currentRoom.walkable_areas ?? []) {
    const floor = new Graphics();
    floor.poly(area.points.flatMap((point) => [point.x, point.y]));
    floor.fill({ color: "#6c7a52", alpha: 0.35 });
    floor.stroke({ color: "#a6c36f", width: 3, alpha: 0.8 });
    world.addChild(floor);
  }
}

function drawObjects(currentScene: Scene) {
  for (const objectId of currentScene.objects) {
    const object = game.objects.find((item) => item.id === objectId);
    if (!object) continue;

    const sprite = createObjectSprite(object);
    sprite.eventMode = "static";
    sprite.cursor = "pointer";
    sprite.x = object.position.x;
    sprite.y = object.position.y;
    sprite.on("pointertap", () => interactWithObject(object));

    objectSprites.set(object.id, sprite);
    world.addChild(sprite);
  }
}

function createObjectSprite(object: GameObject) {
  const colorByKind: Record<string, string> = {
    device: "#caa46a",
    hotspot: "#70a8bf",
    item: "#d9d06f"
  };

  const sprite = new Graphics()
    .roundRect(-48, -42, 96, 84, 12)
    .fill(colorByKind[object.kind] ?? "#9b8fd3")
    .stroke({ color: "#f7f3e8", width: 3, alpha: 0.65 });

  const label = new Text({
    text: object.name,
    style: {
      fill: "#161616",
      fontFamily: "Arial",
      fontSize: 18,
      fontWeight: "700"
    }
  });

  label.anchor.set(0.5);
  label.y = 60;
  sprite.addChild(label);

  return sprite;
}

function drawActor(actor: Actor) {
  playerSprite
    .roundRect(-34, -105, 68, 105, 18)
    .fill("#f0c36a")
    .circle(0, -130, 30)
    .fill("#f4d1a1")
    .stroke({ color: "#111", width: 4, alpha: 0.35 });

  playerSprite.x = actor.position.x;
  playerSprite.y = actor.position.y;
  world.addChild(playerSprite);
}

function interactWithObject(object: GameObject) {
  const interaction = (object.interactions ?? []).find((candidate) => canRun(candidate.conditions ?? []));

  if (!interaction) {
    setMessage(`${object.name}: nada acontece ainda.`);
    return;
  }

  if (interaction.verb === "take") {
    objectSprites.get(object.id)?.destroy();
    objectSprites.delete(object.id);
  }

  for (const effect of interaction.effects ?? []) {
    applyEffect(effect);
  }

  if ((interaction.effects ?? []).length === 0 && interaction.fallback_dialogue) {
    startDialogue(interaction.fallback_dialogue);
  }

  renderHudState();
}

function canRun(conditions: Condition[]) {
  return conditions.every((condition) => {
    const value = state.get(condition.state);

    if (condition.operator === "equals") return value === condition.value;
    if (condition.operator === "not_equals") return value !== condition.value;
    if (condition.operator === "exists") return state.has(condition.state);
    if (condition.operator === "greater_than") return Number(value) > Number(condition.value);
    if (condition.operator === "less_than") return Number(value) < Number(condition.value);

    return false;
  });
}

function applyEffect(effect: Effect) {
  if (effect.kind === "set_state") {
    state.set(effect.target, effect.value);
    setMessage(`Estado atualizado: ${effect.target} = ${String(effect.value)}`);
    return;
  }

  if (effect.kind === "start_dialogue") {
    startDialogue(effect.target, getNodeFromEffect(effect));
    return;
  }

  if (effect.kind === "add_inventory" && typeof effect.value === "string") {
    inventory.add(effect.value);
    state.set("has_wrench", true);
    setMessage("Teo pegou a chave inglesa.");
    return;
  }

  if (effect.kind === "play_motion") {
    pulse(playerSprite);
    return;
  }

  if (effect.kind === "emit_companion_state") {
    setMessage("Companion receberia novo estado: janela_aberta.");
    return;
  }
}

function startDialogue(dialogueId: string, nodeId?: string) {
  const dialogue = game.dialogues.find((item) => item.id === dialogueId);
  if (!dialogue) return;

  const node = findDialogueNode(dialogue, nodeId);
  if (!node) return;

  const speaker = game.world.characters.find((actor) => actor.id === node.speaker);
  setMessage(`${speaker?.name ?? node.speaker}: ${node.text}`);
}

function findDialogueNode(dialogue: Dialogue, nodeId?: string) {
  return dialogue.nodes.find((node) => node.id === nodeId) ?? dialogue.nodes[0];
}

function getNodeFromEffect(effect: Effect) {
  if (typeof effect.value === "object" && effect.value !== null && "node" in effect.value) {
    return String((effect.value as { node: string }).node);
  }

  return undefined;
}

function pulse(sprite: Graphics) {
  sprite.scale.set(1.15);
  setTimeout(() => sprite.scale.set(1), 120);
}

function setMessage(message: string) {
  hudMessage.textContent = message;
}

function renderHudState() {
  hudState.innerHTML = "";

  for (const [key, value] of state.entries()) {
    const pill = document.createElement("span");
    pill.className = "state-pill";
    pill.textContent = `${key}: ${String(value)}`;
    hudState.appendChild(pill);
  }

  if (inventory.size > 0) {
    const pill = document.createElement("span");
    pill.className = "state-pill";
    pill.textContent = `inventory: ${Array.from(inventory).join(", ")}`;
    hudState.appendChild(pill);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
