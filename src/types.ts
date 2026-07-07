export type Point = {
  x: number;
  y: number;
};

export type StateVariable = {
  id: string;
  scope: string;
  type: "boolean" | "number" | "string" | "enum";
  initial: boolean | number | string;
};

export type Effect = {
  kind:
    | "set_state"
    | "start_dialogue"
    | "play_motion"
    | "move_actor"
    | "add_inventory"
    | "remove_inventory"
    | "change_scene"
    | "emit_companion_state"
    | "play_sound";
  target: string;
  value: unknown;
};

export type Condition = {
  state: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "exists";
  value?: unknown;
};

export type Interaction = {
  id: string;
  verb: string;
  label: string;
  conditions?: Condition[];
  effects?: Effect[];
  fallback_dialogue?: string;
};

export type GameObject = {
  id: string;
  name: string;
  kind: string;
  description: string;
  room: string;
  position: Point;
  asset?: string;
  interactions?: Interaction[];
  state?: StateVariable[];
};

export type Motion = {
  id: string;
  kind: string;
  asset?: string;
  speed?: number;
  loop?: boolean;
};

export type Actor = {
  id: string;
  name: string;
  role: string;
  description: string;
  default_room: string;
  position: Point;
  motions?: Motion[];
  inventory?: string[];
  state?: StateVariable[];
};

export type Layer = {
  id: string;
  kind: string;
  z_index: number;
  asset?: string;
  visible?: boolean;
};

export type WalkableArea = {
  id: string;
  shape: "polygon" | "rectangle";
  points: Point[];
};

export type Room = {
  id: string;
  title: string;
  size: {
    width: number;
    height: number;
  };
  camera?: {
    mode: string;
    target_actor?: string;
  };
  walkable_areas?: WalkableArea[];
  layers: Layer[];
};

export type Scene = {
  id: string;
  title: string;
  type: string;
  description: string;
  rooms: Room[];
  actors: string[];
  objects: string[];
  dialogues?: string[];
  events?: Array<{
    id: string;
    trigger: string;
    conditions?: Condition[];
    effects?: Effect[];
  }>;
  entry_event?: string;
  companion_view?: string;
};

export type DialogueNode = {
  id: string;
  speaker: string;
  text: string;
  choices?: Array<{
    label: string;
    conditions?: Condition[];
    effects?: Effect[];
    next?: string;
  }>;
  next?: string;
};

export type Dialogue = {
  id: string;
  participants: string[];
  nodes: DialogueNode[];
};

export type FlowGame = {
  id: string;
  title: string;
  pitch: string;
  world: {
    summary: string;
    global_state?: StateVariable[];
    characters: Actor[];
  };
  scenes: Scene[];
  objects: GameObject[];
  dialogues: Dialogue[];
};
