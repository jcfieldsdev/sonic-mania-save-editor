/******************************************************************************
 * Sonic Mania Save Editor                                                    *
 *                                                                            *
 * Copyright (C) 2020 J.C. Fields (jcfields@jcfields.dev).                    *
 *                                                                            *
 * Permission is hereby granted, free of charge, to any person obtaining a    *
 * copy of this software and associated documentation files (the "Software"), *
 * to deal in the Software without restriction, including without limitation  *
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,   *
 * and/or sell copies of the Software, and to permit persons to whom the      *
 * Software is furnished to do so, subject to the following conditions:       *
 *                                                                            *
 * The above copyright notice and this permission notice shall be included in *
 * all copies or substantial portions of the Software.                        *
 *                                                                            *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR *
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,   *
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL    *
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER *
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING    *
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER        *
 * DEALINGS IN THE SOFTWARE.                                                  *
 ******************************************************************************/

"use strict";

/*
 * constants
 */

// total size of save file
const RETRO_SIZE = 65536;

// file names and locations
const RETRO_SAVE_NAME = "SaveData.bin";
const MIME_TYPE = "application/x-sonic-mania-save-file";
const STORAGE_NAME = "sonicmania";
const HEX_VIEW_WIDTH = 16;

// file format
const MANIA_SLOTS  = 8;
const ENCORE_SLOTS = 3;
const SLOT_SIZE = 1024;
const MANIA_START  = 0x0000;
const ENCORE_START = 0x2800;
const EXTRAS_START = 0x2400;
// Mania/Encore mode
const SLOT_STATE_OFFSET      = 0x058;
const MANIA_CHARACTER_OFFSET = 0x05c;
const STAGE_OFFSET           = 0x060;
const LIVES_OFFSET           = 0x064;
const CONTINUES_OFFSET       = 0x074;
const SCORE_OFFSET           = 0x068;
const EMERALDS_OFFSET        = 0x070;
const SPECIAL_STAGE_OFFSET   = 0x07c;
const GIANT_RINGS_OFFSET     = 0x080;
const OPTIONS_OFFSET         = 0x084;
const NEXT_EXTRA_LIFE_OFFSET = 0x06c;
const PLAY_TIME_OFFSET       = 0x088;
const PLAY_TIME_LENGTH       = 4;
const BONUS_STAGE_TIME_OFFSET   = 0x0f8;
const SPECIAL_STAGE_TIME_OFFSET = 0x0fc;
const ENCORE_CHARACTER1_OFFSET  = 0x110;
const ENCORE_CHARACTER2_OFFSET  = 0x111;
const ENCORE_CHARACTERS_OFFSET  = 0x108;
const CHARACTER_ORDER_OFFSET    = 0x10c;
const COLLECTED_CHARACTERS      = 3;
const MANIA_UNKNOWN_OFFSET      = 0x078;
// extras
const MEDALS_OFFSET = 0x056;
const FLAGS_OFFSET  = 0x078;
const MEDALS_LENGTH = 32;
const SILVER_MEDALS_OFFSET = 0x120;
const GOLD_MEDALS_OFFSET   = 0x11c;
const EXTRAS_UNKNOWN_OFFSET = 0x118;

// game mechanics
const NEW = 0, IN_PROGRESS = 1, CLEAR = 2;
const STAGES = [
	"Green Hill", "Chemical Plant", "Studiopolis", "Flying Battery",
	"Press Garden Zone", "Stardust Speedway", "Hydrocity", "Mirage Saloon",
	"Oil Ocean Zone", "Lava Reef", "Metallic Madness", "Titanic Monarch",
	"Egg Reverie"
];
const ZONES = 12;
const ACTS = 2;
const TOTAL_LEVELS = ZONES * ACTS + 1;
const EMERALDS = 7;
const COMPLETED = 0x7f; // for emeralds
const EXTRA_LIFE = 50000;
const CLEAR_EXTRA_LIFE = EXTRA_LIFE * 10;
const SONIC_TAILS = 0, SONIC = 1, TAILS = 2, KNUCKLES = 3, MIGHTY = 4, RAY = 5;
const ENCORE_CHARACTER = 6;
const DEFAULT_LIVES = 3, DEFAULT_CONTINUES = 0;
const TIME_LIMIT = 32, DEBUG_MODE = 1, AND_KNUCKLES = 2;
const CD_ABILITIES = 20, S3K_ABILITIES = 24;
const EMPTY = 0, SILVER = 1, GOLD = 2;

// editor
const RETRO = 0;
const MANIA_MODE = 0, ENCORE_MODE = 1;

// animated background
const DEFAULT_SPEED = 5;
const CANVAS_WIDTH = 1024;
const INNER_RING_SCALE = 0.5;
const OUTER_RING_SCALE = 0.75;
const INNER_RING_WIDTH = 12;
const OUTER_RING_WIDTH = 18;
const INNER_RING_COLOR = "#faa01d";
const OUTER_RING_COLOR = "#95b0c2";
const BACKGROUND_COLOR = "#f6d95b";

/*
 * initialization
 */

window.addEventListener("load", function() {
	const bg = new Background();
	const editor = new Editor();
	const store = new Storage(STORAGE_NAME);

	bg.init();

	try {
		const {save, selected, speed} = store.load();
		const saveCollection = new SaveCollection();

		if (speed != undefined) {
			bg.setSpeed(speed);
		}

		if (save != undefined) {
			saveCollection.loadFromStorage(save);
		}

		editor.open(saveCollection, selected);
	} catch (err) {
		store.reset();
		displayError(err);
	}

	window.addEventListener("beforeunload", function() {
		store.save(editor.saveToStorage());
	});
	window.addEventListener("keyup", function(event) {
		const keyCode = event.keyCode;

		if (keyCode == 27) { // Esc
			for (const element of $$(".overlay")) {
				element.classList.remove("open");
			}
		}

		if (keyCode == 192) { // grave
			editor.toggleHexView();
		}
	});
	window.addEventListener("resize", function() {
		bg.resizeCanvas();

		if (bg.rate == 0) { // forces redraw if animation off
			bg.drawBackground();
		}
	});

	document.addEventListener("click", function(event) {
		const element = event.target;

		if (element.matches("#download")) {
			try {
				const {filename, blob} = editor.saveToFile();

				const a = $("#link");
				a.download = filename;
				a.href = window.URL.createObjectURL(blob);
				a.click();
				window.URL.revokeObjectURL(blob);
			} catch (err) {
				displayError(err);
			}
		}

		if (element.matches("#maniaSlot .tab")) {
			editor.setSlot(Number(element.value), MANIA_MODE);
		}

		if (element.matches("#encoreSlot .tab")) {
			editor.setSlot(Number(element.value), ENCORE_MODE);
		}

		if (element.matches("#reset")) {
			editor.restoreDefaults();
		}

		if (element.matches("#toggleUnknown")) {
			for (const section of $$(".section_unknown")) {
				section.hidden = !section.hidden;
			}
		}

		if (element.matches(".maniaCharacter")) {
			selectButton(element, ".maniaCharacter");
			editor.saveManiaMode();
		}

		if (element.matches(".encoreCharacter1")) {
			selectButton(element, ".encoreCharacter1");
			editor.saveEncoreMode();
		}

		if (element.matches(".encoreCharacter2")) {
			if (element.classList.contains("selected")) {
				element.classList.remove("selected");
			} else {
				selectButton(element, ".encoreCharacter2");
			}

			editor.saveEncoreMode();
		}

		if (element.matches(".maniaEmerald")) {
			element.classList.toggle("collected");
			editor.saveManiaMode();
		}

		if (element.matches(".encoreEmerald")) {
			element.classList.toggle("collected");
			editor.saveEncoreMode();
		}

		if (element.closest(".maniaRing")) {
			element.closest(".maniaRing").classList.toggle("active");
			editor.saveManiaMode();
		}

		if (element.closest(".encoreRing")) {
			element.closest(".encoreRing").classList.toggle("active");
			editor.saveEncoreMode();
		}

		if (element.matches(".encoreCharacters")) {
			element.classList.toggle("active");
			editor.saveEncoreMode();
		}

		if (element.matches(".characterOrder")) {
			editor.moveCharacter(Number(element.value));
			editor.saveEncoreMode();
		}

		if (element.matches(".timeLimit")) {
			selectButton(element, ".timeLimit");
			editor.saveManiaMode();
		}

		if (element.matches(".debugMode")) {
			selectButton(element, ".debugMode");
			editor.saveManiaMode();
		}

		if (element.matches(".sonicAbility")) {
			selectButton(element, ".sonicAbility");
			editor.saveManiaMode();
		}

		if (element.matches(".andKnuckles")) {
			selectButton(element, ".andKnuckles");
			editor.saveManiaMode();
		}

		if (element.matches(".medal")) {
			if (element.classList.contains("empty")) {
				element.value = SILVER;
			} else if (element.classList.contains("silver")) {
				element.value = GOLD;
			} else if (element.classList.contains("gold")) {
				element.value = EMPTY;
			}

			editor.saveExtras();
		}

		if (element.matches(".setAllMedals")) {
			for (const medal of $$(".medal")) {
				medal.value = Number(element.value);
			}

			editor.saveExtras();
		}

		if (element.closest(".close")) {
			element.closest(".overlay").classList.remove("open");
		}
	});
	document.addEventListener("input", function(event) {
		const element = event.target;

		if (element.matches("#speed")) {
			bg.changeSpeed(Number(element.value));
		}

		if (element.matches("#maniaMode input:not(.level)")) {
			editor.saveManiaMode();
		}

		if (element.matches("#encoreMode input:not(.level)")) {
			editor.saveEncoreMode();
		}

		if (element.matches("#extras input")) { // for unknowns
			editor.saveExtras();
		}

		// load but not save to avoid saving times from previous level
		// to next level
		if (element.matches("#maniaMode .level")) {
			editor.loadManiaMode();
		}

		if (element.matches("#encoreMode .level")) {
			editor.loadEncoreMode();
		}
	});

	$("#file").addEventListener("change", function(event) {
		const file = event.target.files[0];

		if (file != null) {
			const reader = new FileReader();
			reader.addEventListener("load", function(event) {
				try {
					const saveCollection = new SaveCollection();
					saveCollection.loadFromFile(file.name, event.target.result);
					editor.open(saveCollection);
				} catch (err) {
					displayError(err);
				}
			});
			reader.readAsArrayBuffer(file);
		}
	});

	function displayError(message) {
		$("#error").classList.add("open");
		$("#error p").textContent = message;
	}

	function selectButton(element, selector) {
		for (const button of $$(selector)) {
			button.classList.toggle("selected", element == button);
		}
	}
});

function $(selector) {
	return document.querySelector(selector);
}

function $$(selector) {
	return Array.from(document.querySelectorAll(selector));
}

/*
 * Editor prototype
 */

function Editor() {
	this.saveCollection = null;
	this.selected = [0, 0];
}

Editor.prototype.open = function(saveCollection, selected) {
	this.saveCollection = saveCollection;

	if (Array.isArray(selected)) {
		this.selected = selected;
	}

	this.setSlot(this.selected[MANIA_MODE],  MANIA_MODE);
	this.setSlot(this.selected[ENCORE_MODE], ENCORE_MODE);

	this.loadExtras();
};

Editor.prototype.setSlot = function(selected=0, mode=MANIA_MODE) {
	this.selected[mode] = selected;

	const id = ["mania", "encore"][mode];

	for (const element of $$(`#${id}Slot .tab`)) {
		element.classList.toggle("active", element.value == selected);
	}

	if (mode == MANIA_MODE) {
		this.loadManiaMode();
	} else if (mode == ENCORE_MODE) {
		this.loadEncoreMode();
	}
};

Editor.prototype.restoreDefaults = function() {
	const saveCollection = new SaveCollection();
	saveCollection.platform = this.saveCollection.platform;

	this.open(saveCollection);
};

Editor.prototype.saveToFile = function() {
	if (this.saveCollection.length == 0) {
		return;
	}

	const file = this.saveCollection.saveToFile();

	return {
		filename: RETRO_SAVE_NAME,
		blob:     new Blob([file], {type: MIME_TYPE})
	};
};

Editor.prototype.saveToStorage = function() {
	if (this.saveCollection != null) {
		return {
			save:     this.saveCollection.saveToStorage(),
			selected: this.selected,
			speed:    Number($("#speed").value),
		};
	}
};

Editor.prototype.loadManiaMode = function() {
	const current = this.selected[MANIA_MODE];
	const slot = this.saveCollection.maniaSlots[current];

	if (slot == null) {
		return;
	}

	let changed = this.loadSinglePlayer(MANIA_MODE, "#maniaMode", slot);

	const CHARACTERS = [
		"sonictails", "sonic", "tails",
		"knuckles", "mighty", "ray"
	];

	for (const [i, element] of $$("#maniaSlot .tab").entries()) {
		const tabSlot = this.saveCollection.maniaSlots[i];

		element.classList.remove(...CHARACTERS);

		if (tabSlot.state != NEW) {
			const character = CHARACTERS[tabSlot.character];
			element.classList.add(character);
		}
	}

	for (const element of $$(".maniaCharacter")) {
		const state = slot.character == Number(element.value);
		element.classList.toggle("selected", state);
		element.disabled = slot.state == NEW;
	}

	setOption(".timeLimit",    TIME_LIMIT);
	setOption(".debugMode",    DEBUG_MODE);
	setOption(".sonicAbility", CD_ABILITIES | S3K_ABILITIES);
	setOption(".andKnuckles",  AND_KNUCKLES);

	$("#maniaUnknown").value = slot.unknown;

	if (changed) {
		this.saveManiaMode();
	}

	function setOption(selector, value) {
		for (const element of $$(selector)) {
			const state = (slot.options & value) == Number(element.value);
			element.classList.toggle("selected", state);
		}
	}
};

Editor.prototype.loadEncoreMode = function() {
	const current = this.selected[ENCORE_MODE];
	const slot = this.saveCollection.encoreSlots[current];

	if (slot == null) {
		return;
	}

	let changed = this.loadSinglePlayer(ENCORE_MODE, "#encoreMode", slot);

	for (const element of $$(".encoreCharacter1")) {
		const value = Number(element.value);
		const state = slot.character1 == value;
		element.classList.toggle("selected", state);
		element.disabled = slot.state == NEW || value == slot.character2;
	}

	for (const element of $$(".encoreCharacter2")) {
		const value = Number(element.value);
		const state = slot.character2 == value;
		element.classList.toggle("selected", state);
		element.disabled = slot.state == NEW || value == slot.character1;
	}

	for (const element of $$(".encoreCharacters")) {
		const value = Number(element.value);
		const state = slot.characters & value;
		const isPlayed = value == slot.character1 || value == slot.character2;
		element.classList.toggle("active", state || isPlayed);
		element.disabled = slot.state == NEW
			|| slot.character2 == 0
			|| isPlayed;

		if (state && !isPlayed && !slot.characterOrder.includes(value)) {
			// removes empty spots
			slot.characterOrder = slot.characterOrder.filter(function(chr) {
				return chr > 0;
			});

			// maximum 3 characters
			if (slot.characterOrder.length < COLLECTED_CHARACTERS) {
				slot.characterOrder.push(value);
				changed = true;
			}
		} else if (!state && slot.characterOrder.includes(value)) {
			// removes character
			slot.characterOrder = slot.characterOrder.filter(function(chr) {
				return chr != value;
			});
			changed = true;
		}
	}

	// removes primary and secondary characters from collected characters array
	slot.characterOrder = slot.characterOrder.filter(function(chr) {
		return chr != slot.character1 && chr != slot.character2;
	});

	const CHARACTER_CLASSES1 = [ // primary character
		"sonictails", "sonic", "tails",
		"knuckles", "mighty", "ray"
	];
	const CHARACTER_CLASSES2 = [ // secondary character
		"sonictails2", "sonic2", "tails2",
		"knuckles2", "mighty2", "ray2"
	];
	const CHARACTER_NAMES = [
		"Sonic & Tails", "Sonic", "Tails",
		"Knuckles", "Mighty", "Ray"
	];

	const p = document.createElement("p");

	for (const character of slot.characterOrder) {
		if (character > 0) {
			const key = Math.log2(character) + 1;
			const className = CHARACTER_CLASSES1[key];
			const characterName = CHARACTER_NAMES[key];

			const button = document.createElement("button");
			button.classList.add("characterOrder", "mini", className);
			button.title = `${characterName}\nClick to move to end`;
			button.value = character;
			button.disabled = slot.state == NEW || slot.character2 == 0;

			const span = document.createElement("span");
			span.appendChild(document.createTextNode(characterName));
			button.append(span);
			p.appendChild(button);
		}
	}

	$("#section_characterOrder p").replaceWith(p);

	for (const [i, element] of $$("#encoreSlot .tab").entries()) {
		const tabSlot = this.saveCollection.encoreSlots[i];

		element.classList.remove(...CHARACTER_CLASSES1);
		element.classList.remove(...CHARACTER_CLASSES2);

		if (tabSlot.state != NEW) {
			const key1 = Math.log2(tabSlot.character1) + 1;
			const key2 = Math.log2(tabSlot.character2) + 1;
			const character1 = CHARACTER_CLASSES1[key1];
			const character2 = CHARACTER_CLASSES2[key2];

			if (character1 != undefined) {
				element.classList.add(character1);
			}

			if (character2 != undefined) {
				element.classList.add(character2);
			}
		}
	}

	$("#encoreUnknown").value = slot.unknown;

	if (changed) {
		this.saveEncoreMode();
	}
};

Editor.prototype.loadSinglePlayer = function(mode, rootSelector, slot) {
	const rootElement = document.querySelector(rootSelector);

	const $ = function(selector) {
		return rootElement.querySelector(selector);
	};
	const $$ = function(selector) {
		return Array.from(rootElement.querySelectorAll(selector));
	};

	let changed = false;

	$(".lives").value = slot.lives;
	$(".continues").value = slot.continues;
	$(".score").value = slot.score;

	$(".lives").disabled = slot.state == NEW;
	$(".continues").disabled = slot.state == NEW;
	$(".score").disabled = slot.state == NEW;

	let emeralds = 0;

	for (const element of $$(".emerald")) {
		const state = slot.emeralds & Number(element.value);
		element.classList.toggle("collected", state);
		element.disabled = slot.state == NEW;

		emeralds += state;
	}

	for (const element of $$(".ring")) {
		const state = slot.giantRings & (1 << Number(element.value));
		element.classList.toggle("active", state);
		element.disabled = slot.state == NEW;
	}

	let n = 0;

	if (emeralds != COMPLETED) {
		const unplayedSpecialStages = [];

		for (let i = 0; i < EMERALDS; i++) {
			const value = emeralds & 1 << i;

			if (value == 0) {
				unplayedSpecialStages.push(i + 1);
			}
		}

		const options = $$(".specialStages option");

		for (const element of options) {
			const value = Number(element.value);
			element.disabled = !unplayedSpecialStages.includes(value);
		}

		n = slot.specialStage;

		if (!unplayedSpecialStages.includes(n)) {
			// finds first selectable special stage
			const element = options.find(function(option) {
				return Number(option.value) == unplayedSpecialStages[0];
			});
			n = Number(element.value);
			changed = true;
		}
	}

	$(".specialStages").value = n;
	$(".specialStages").disabled = slot.state == NEW || emeralds == COMPLETED;

	let active = false, url = "";

	switch (slot.state) {
		case NEW:
			$(".stage").value = 0;
			$(".showStage").textContent = "New Game";

			active = false;
			url = "images/panel-new.png";

			break;
		case CLEAR:
			$(".stage").value = ZONES + 1;
			$(".showStage").textContent = "Clear";

			active = false;
			url = "images/panel-clear.png";

			break;
		default:
			$(".stage").value = slot.stage;
			$(".showStage").textContent = STAGES[slot.stage - 1];

			const stage = slot.stage.toString().padStart(2, "0");
			const suffix = mode == ENCORE_MODE ? "-encore" : "";

			active = true; // enables scrolling animation
			url = "images/stage-" + stage + suffix + ".png";
	}

	const bg = new Image();
	bg.src = url;
	bg.addEventListener("load", function() {
		$(".preview").style.backgroundImage = `url(${url})`;
		$(".preview").classList.toggle("active", active);
	});

	const level = Number($(".level").value);
	$(".level").disabled = slot.state == NEW;
	$(".showLevel").textContent = formatLevel(level);

	const {hr, min, sec, tick} = slot.times[level];

	$(".hr").value   = hr.toString();
	$(".min").value  = min.toString();
	$(".sec").value  = sec.toString().padStart(2, "0");
	$(".tick").value = tick.toString().padStart(2, "0");

	$(".hr").disabled    = slot.state == NEW;
	$(".min").disabled   = slot.state == NEW;
	$(".sec").disabled   = slot.state == NEW;
	$(".tick").disabled  = slot.state == NEW;

	const [totalHr, totalMin, totalSec, totalTick] = formatTotalTime();

	$(".totalHr").textContent   = totalHr.toString();
	$(".totalMin").textContent  = totalMin.toString();
	$(".totalSec").textContent  = totalSec.toString().padStart(2, "0");
	$(".totalTick").textContent = totalTick.toString().padStart(2, "0");

	// saves again if something changed by rules and not by user
	return changed;

	function formatLevel(level) {
		switch (level) {
			case TOTAL_LEVELS - 1:
				return STAGES[ZONES];
			case TOTAL_LEVELS:
				return "Bonus Stages";
			case TOTAL_LEVELS + 1:
				return "Special Stages";
			default:
				const zone = Math.ceil((level - 1) / ACTS);
				const act = level % ACTS;

				return STAGES[zone] + " " + ["Act I", "Act II"][act];
		}
	}

	function formatTotalTime() {
		const totalTime = slot.times.reduce(function(total, time) {
			const {hr, min, sec, tick} = time;
			return total + hr * 60 * 60 * 60 + min * 60 * 60 + sec * 60 + tick;
		}, 0);

		const hr   = Math.floor(totalTime / (60 * 60 * 60));
		const rem1 = totalTime % (60 * 60 * 60);
		const min  = Math.floor(rem1 / (60 * 60));
		const rem2 = totalTime % (60 * 60);
		const sec  = Math.floor(rem2 / 60);
		const tick = rem2 % 60;

		return [hr, min, sec, tick];
	}
};

Editor.prototype.loadExtras = function() {
	const slot = this.saveCollection.extras;

	if (slot == null) {
		return;
	}

	for (const [i, element] of $$(".medal").entries()) {
		const value = slot.medals[i];
		element.value = value;

		element.classList.toggle("empty",  value == EMPTY);
		element.classList.toggle("silver", value == SILVER);
		element.classList.toggle("gold",   value == GOLD);
	}

	for (const element of $$(".flag")) {
		const value = Number(element.value);
		element.checked = slot.flags[value];
	}

	for (const element of $$(".alert")) { // alerts are inverted
		const value = Number(element.value);
		element.checked = !slot.flags[value];
	}

	$("#extrasUnknown").value = slot.unknown;
};

Editor.prototype.saveManiaMode = function() {
	const current = this.selected[MANIA_MODE];
	const slot = this.saveCollection.maniaSlots[current];

	if (slot == null) {
		return;
	}

	this.saveSinglePlayer("#maniaMode", slot);

	const character1 = slot.state == NEW             ? 0
	                 : slot.character == SONIC_TAILS ? SONIC
	                 : slot.character == SONIC       ? 0
	                 : 1 << slot.character - 1;

	const character2 = slot.state == NEW             ? 0
	                 : slot.options & AND_KNUCKLES   ? 1 << KNUCKLES - 1
	                 : slot.character == SONIC_TAILS ? 1 << TAILS - 1
	                 : 0;

	slot.load({
		character:  this.fillToggle($(".maniaCharacter.selected"), 0),
		character1: character1,
		character2: character2,
		unknown:    this.fillNumber($("#maniaUnknown"))
	});
	this.loadManiaMode();
};

Editor.prototype.saveEncoreMode = function() {
	const current = this.selected[ENCORE_MODE];
	const slot = this.saveCollection.encoreSlots[current];

	if (slot == null) {
		return;
	}

	this.saveSinglePlayer("#encoreMode", slot);

	const character1 = this.fillToggle($(".encoreCharacter1.selected"), 0);
	const character2 = this.fillToggle($(".encoreCharacter2.selected"), 0);

	const characterOrder = Array(COLLECTED_CHARACTERS).fill(0);

	for (const [i, element] of $$(".characterOrder").entries()) {
		characterOrder[i] = Number(element.value);
	}

	let characters = 0;

	for (const element of $$(".encoreCharacters")) {
		const value = Number(element.value);

		if (element.classList.contains("active")) {
			// adds any characters collected but not in order
			if (!characterOrder.includes(value)) {
				characterOrder.push(value);
			}

			characters += value;
		}
	}

	slot.load({
		character:      ENCORE_CHARACTER,
		character1:     character1,
		character2:     character2,
		characters:     characters,
		characterOrder: characterOrder,
		unknown:        this.fillNumber($("#encoreUnknown"))
	});
	this.loadEncoreMode();
};

Editor.prototype.saveSinglePlayer = function(rootSelector, slot) {
	const rootElement = document.querySelector(rootSelector);

	const $ = function(selector) {
		return rootElement.querySelector(selector);
	};
	const $$ = function(selector) {
		return Array.from(rootElement.querySelectorAll(selector));
	};

	const stage = Number($(".stage").value);
	const state = stage == 0         ? NEW
	            : stage == ZONES + 1 ? CLEAR
	            : IN_PROGRESS;

	const emeralds = $$(".collected").reduce(countSelected, 0);
	const options = $$(".option.selected").reduce(countSelected, 0);

	const giantRings = $$(".ring").reduce(function(count, element) {
		if (element.classList.contains("active")) {
			return count | 1 << Number(element.value);
		}

		return count;
	}, 0);

	const times = slot.times;
	const index = Number($(".level").value);

	times[index] = {
		hr:   this.fillNumber($(".hr")),
		min:  this.fillNumber($(".min")),
		sec:  this.fillNumber($(".sec")),
		tick: this.fillNumber($(".tick"))
	};

	slot.load({
		state:        state,
		lives:        this.fillNumber($(".lives")),
		continues:    this.fillNumber($(".continues")),
		score:        this.fillNumber($(".score")),
		stage:        stage,
		specialStage: Number($(".specialStages").value),
		emeralds:     emeralds,
		giantRings:   giantRings,
		options:      options,
		times:        times
	});

	function countSelected(count, element) {
		return count + Number(element.value);
	}
};

Editor.prototype.saveExtras = function() {
	const slot = this.saveCollection.extras;

	if (slot == null) {
		return;
	}

	const medals = $$(".medal").map(function(element) {
		return Number(element.value);
	});

	const flags = slot.flags;

	for (const element of $$(".flag")) {
		const value = Number(element.value);
		flags[value] = element.checked;
	}

	for (const element of $$(".alert")) { // alerts are inverted
		const value = Number(element.value);
		flags[value] = !element.checked;
	}

	const unknown = this.fillNumber($("#extrasUnknown"));

	slot.load({medals, flags, unknown});
	this.loadExtras();
};

Editor.prototype.fillToggle = function(element, defaultValue=0) {
	// checks if element exists before attempting to use its value
	return element != null ? Number(element.value) : defaultValue;
};

Editor.prototype.fillNumber = function(element) {
	let value = Number(element.value);
	value = Math.min(element.max, value);
	value = Math.max(element.min, value);

	return value;
};

Editor.prototype.moveCharacter = function(value) {
	const current = this.selected[ENCORE_MODE];
	const slot = this.saveCollection.encoreSlots[current];

	if (slot == null) {
		return;
	}

	slot.characterOrder = slot.characterOrder.sort(function(a, b) {
		return a == value ?  1
		     : b == value ? -1
		     : 0;
	});
	this.loadEncoreMode();
};

Editor.prototype.toggleHexView = function() {
	if (this.saveCollection.length == 0) {
		return;
	}

	const state = !$("#hexview").classList.contains("open");

	if (state) {
		const {blob} = this.saveToFile();

		const reader = new FileReader();
		reader.addEventListener("load", function(event) {
			const file = new Uint8Array(event.target.result);

			const pad = Math.ceil(Math.log(file.length + 1) / Math.log(16));
			let col = "", hex = "", asc = "";

			for (const [i, character] of file.entries()) {
				hex += character.toString(16).padStart(2, "0") + " ";

				// range of printable characters in ASCII
				if (character >= 0x20 && character <= 0x7e) {
					asc += String.fromCharCode(character) + " ";
				} else {
					asc += "  ";
				}

				if (i % HEX_VIEW_WIDTH == 0) {
					col += i.toString(16).padStart(pad, "0") + "\n";
				} else if ((i + 1) % HEX_VIEW_WIDTH == 0) {
					hex += "\n";
					asc += "\n";
				}
			}

			$("#col").textContent = col;
			$("#hex").textContent = hex;
			$("#asc").textContent = asc;
		});
		reader.readAsArrayBuffer(blob);
	} else {
		$("#col").textContent = "";
		$("#hex").textContent = "";
		$("#asc").textContent = "";
	}

	$("#hexview").classList.toggle("open", state);
};

/*
 * SaveCollection prototype
 */

function SaveCollection() {
	this.maniaSlots = Array(MANIA_SLOTS).fill().map(function(undefined, i) {
		return new SaveSlot(MANIA_MODE, i);
	});
	this.encoreSlots = Array(ENCORE_SLOTS).fill().map(function(undefined, i) {
		return new SaveSlot(ENCORE_MODE, i);
	});
	this.extras = new Extras();
	this.platform = RETRO;
}

SaveCollection.prototype.loadFromFile = function(name, buffer) {
	const file = new Uint8Array(buffer);

	if (file.length != RETRO_SIZE) {
		throw "Could not determine format of file.";
	}

	for (let i = 0; i < MANIA_SLOTS; i++) {
		const slot = new SaveSlot(MANIA_MODE, i);
		slot.openSlot(file.slice(
			MANIA_START + i * SLOT_SIZE,
			MANIA_START + (i + 1) * SLOT_SIZE
		));

		this.maniaSlots[i] = slot;
	}

	for (let i = 0; i < ENCORE_SLOTS; i++) {
		const slot = new SaveSlot(ENCORE_MODE, i);
		slot.openSlot(file.slice(
			ENCORE_START + i * SLOT_SIZE,
			ENCORE_START + (i + 1) * SLOT_SIZE
		));

		this.encoreSlots[i] = slot;
	}

	this.extras = new Extras();
	this.extras.open(file.slice(EXTRAS_START, EXTRAS_START + SLOT_SIZE));
};

SaveCollection.prototype.loadFromStorage = function(obj) {
	const {maniaSlots, encoreSlots, extras, platform} = obj;

	this.maniaSlots = maniaSlots.map(function(save, i) {
		const slot = new SaveSlot(MANIA_MODE, i);
		slot.load(save);

		return slot;
	});
	this.encoreSlots = encoreSlots.map(function(save, i) {
		const slot = new SaveSlot(ENCORE_MODE, i);
		slot.load(save);

		return slot;
	});

	this.extras = new Extras();
	this.extras.load(extras);

	this.platform = platform || RETRO;
};

SaveCollection.prototype.saveToFile = function() {
	const file = new Uint8Array(RETRO_SIZE);

	writeSection(MANIA_START,  this.maniaSlots);
	writeSection(ENCORE_START, this.encoreSlots);

	writeSlot(this.extras.save(), EXTRAS_START);

	return file;

	function writeSection(pos, slots) {
		for (const slot of slots) {
			const buffer = slot.saveSlot();
			writeSlot(buffer, pos);
			pos += buffer.length;
		}
	}

	function writeSlot(bytes, start=0) {
		for (let i = 0; i < bytes.length; i++) {
			file[start + i] = bytes[i];
		}
	}
};

SaveCollection.prototype.saveToStorage = function() {
	return {
		maniaSlots:  this.maniaSlots,
		encoreSlots: this.encoreSlots,
		extras:      this.extras,
		platform:    this.platform
	};
};

/*
 * SaveSlot prototype
 */

function SaveSlot(mode, slot=0) {
	this.mode = mode;

	this.state          = mode == MANIA_MODE ? Number(slot == 0) : 0;
	this.character      = SONIC_TAILS;
	this.character1     = mode == MANIA_MODE ? 0 : SONIC;
	this.character2     = 0;
	this.characters     = 0;
	this.characterOrder = Array(COLLECTED_CHARACTERS).fill(0);
	this.lives          = mode == MANIA_MODE ? DEFAULT_LIVES : 0;
	this.continues      = DEFAULT_CONTINUES;
	this.score          = 0;
	this.nextExtraLife  = 0;
	this.stage          = 1;
	this.specialStage   = 1;
	this.emeralds       = 0;
	this.giantRings     = 0;
	this.options        = 0;
	this.times          = Array(TOTAL_LEVELS + 2).fill().map(function() {
		return {
			hr:   0,
			min:  0,
			sec:  0,
			tick: 0
		};
	});
	this.unknown = 0;
}

SaveSlot.prototype.load = function(obj) {
	for (const [key, value] of Object.entries(obj)) {
		if (this.hasOwnProperty(key)) {
			this[key] = value;
		}
	}
};

SaveSlot.prototype.openSlot = function(original) {
	const file = new Uint8Array(original);

	const characterOrder = this.characterOrder.map(function(undefined, i) {
		return file[CHARACTER_ORDER_OFFSET + i];
	});

	this.state          = file[SLOT_STATE_OFFSET];
	this.character      = file[MANIA_CHARACTER_OFFSET];
	this.character1     = file[ENCORE_CHARACTER1_OFFSET];
	this.character2     = file[ENCORE_CHARACTER2_OFFSET];
	this.characters     = file[ENCORE_CHARACTERS_OFFSET];
	this.characterOrder = characterOrder;
	this.stage          = Math.min(file[STAGE_OFFSET] + 1, ZONES);
	this.lives          = file[LIVES_OFFSET];
	this.continues      = file[CONTINUES_OFFSET];
	this.score          = getLong(SCORE_OFFSET);
	this.nextExtraLife  = getLong(NEXT_EXTRA_LIFE_OFFSET);
	this.emeralds       = file[EMERALDS_OFFSET];
	this.specialStage   = Math.min(file[SPECIAL_STAGE_OFFSET] + 1, EMERALDS);
	this.giantRings     = file[GIANT_RINGS_OFFSET];
	this.options        = file[OPTIONS_OFFSET];
	this.unknown        = file[MANIA_UNKNOWN_OFFSET];

	const times = [];

	for (let i = 0; i < TOTAL_LEVELS; i++) {
		const pos = PLAY_TIME_OFFSET + i * PLAY_TIME_LENGTH;
		times.push(getTime(pos));
	}

	times.push(getTime(BONUS_STAGE_TIME_OFFSET));
	times.push(getTime(SPECIAL_STAGE_TIME_OFFSET));

	this.times = times;

	function getLong(pos) {
		return file[pos]
	         | file[pos + 1] << 8
	         | file[pos + 2] << 16
	         | file[pos + 3] << 24;
	}

	function getTime(pos) {
		const time = file[pos] | (file[pos + 1] << 8) | (file[pos + 2] << 16);

		const hr   = Math.floor(time / (60 * 60 * 60));
		const rem1 = time % (60 * 60 * 60);
		const min  = Math.floor(rem1 / (60 * 60));
		const rem2 = time % (60 * 60);
		const sec  = Math.floor(rem2 / 60);
		const tick = rem2 % 60;

		return {hr, min, sec, tick};
	}
};

SaveSlot.prototype.saveSlot = function() {
	const file = new Uint8Array(SLOT_SIZE);

	const stage = this.state == NEW   ? 0
	            : this.state == CLEAR ? ZONES
	            : this.stage - 1;

	const specialStage = this.emeralds < COMPLETED ? this.specialStage - 1 : 0;

	file[SLOT_STATE_OFFSET]        = this.state;
	file[MANIA_CHARACTER_OFFSET]   = this.character;
	file[ENCORE_CHARACTER1_OFFSET] = this.character1;
	file[ENCORE_CHARACTER2_OFFSET] = this.character2;
	file[ENCORE_CHARACTERS_OFFSET] = this.characters;
	file[STAGE_OFFSET]             = stage;
	file[LIVES_OFFSET]             = this.lives;
	file[CONTINUES_OFFSET]         = this.continues;
	file[EMERALDS_OFFSET]          = this.emeralds;
	file[SPECIAL_STAGE_OFFSET]     = specialStage;
	file[GIANT_RINGS_OFFSET]       = this.giantRings;
	file[OPTIONS_OFFSET]           = this.options;
	file[MANIA_UNKNOWN_OFFSET]     = this.unknown;

	const characterOrder = this.characterOrder.reduce(function(count, chr, i) {
		return count + (chr << i * 8);
	}, 0);
	setLong(CHARACTER_ORDER_OFFSET, characterOrder);

	const score = this.score;
	setLong(SCORE_OFFSET, score);

	if (this.state != NEW) {
		let nextExtraLife = 0;

		if (this.state == CLEAR) { // sets to 500,000 if the game is cleared
			nextExtraLife = CLEAR_EXTRA_LIFE;
		} else { // else sets to the next multiple of 50,000 after current score
			nextExtraLife = score + (EXTRA_LIFE - score % EXTRA_LIFE);
		}

		setLong(NEXT_EXTRA_LIFE_OFFSET, nextExtraLife);
	}

	for (let i = 0; i < TOTAL_LEVELS; i++) {
		const pos = PLAY_TIME_OFFSET + i * PLAY_TIME_LENGTH;
		setTime(pos, this.times[i]);
	}

	setTime(BONUS_STAGE_TIME_OFFSET,   this.times[TOTAL_LEVELS]);
	setTime(SPECIAL_STAGE_TIME_OFFSET, this.times[TOTAL_LEVELS + 1]);

	return file;

	function setLong(pos, data) {
		file[pos]     =  data & 0x000000ff;
		file[pos + 1] = (data & 0x0000ff00) >> 8;
		file[pos + 2] = (data & 0x00ff0000) >> 16;
		file[pos + 3] = (data & 0xff000000) >> 32;
	}

	function setTime(pos, time) {
		const {hr, min, sec, tick} = time;
		setLong(pos, hr * 60 * 60 * 60 + min * 60 * 60 + sec * 60 + tick);
	}
};

/*
 * Extras prototype
 */

function Extras() {
	this.medals = Array(MEDALS_LENGTH).fill(EMPTY);
	this.flags  = Array(MEDALS_LENGTH).fill(true);

	this.flags[0] = false;

	this.unknown = 0;
}

Extras.prototype.load = function(obj) {
	for (const [key, value] of Object.entries(obj)) {
		if (this.hasOwnProperty(key)) {
			this[key] = value;
		}
	}
};

Extras.prototype.open = function(original) {
	const file = new Uint8Array(original);

	this.medals = Array.from(file.slice(
		MEDALS_OFFSET,
		MEDALS_OFFSET + MEDALS_LENGTH
	));

	this.flags = [];

	for (let i = 0; i < MEDALS_LENGTH; i++) {
		this.flags.push(Boolean(file[FLAGS_OFFSET + i * 4]));
	}

	this.unknown = file[EXTRAS_UNKNOWN_OFFSET];
};

Extras.prototype.save = function() {
	const file = new Uint8Array(SLOT_SIZE);

	let silverMedals = 0, goldMedals = 0;

	for (let i = 0; i < MEDALS_LENGTH; i++) {
		const medal = this.medals[i];
		file[MEDALS_OFFSET + i] = medal;

		if (medal >= SILVER) {
			silverMedals++;

			if (medal == GOLD) {
				goldMedals++;
			}
		}
	}

	file[SILVER_MEDALS_OFFSET] = silverMedals;
	file[GOLD_MEDALS_OFFSET]   = goldMedals;

	for (let i = 0; i < MEDALS_LENGTH; i++) {
		file[FLAGS_OFFSET + i * 4] = this.flags[i];
	}

	file[EXTRAS_UNKNOWN_OFFSET] = this.unknown;

	return file;
};

/*
 * Background prototype
 */

function Background() {
	this.canvas = null;
	this.context = null;

	this.deg = 0;
	this.rate = 0;
	this.scale = 0;

	this.cx = 0;
	this.cy = 0;
}

Background.prototype.init = function() {
	const reducedMotion = window.matchMedia("(prefers-reduced-motion)").matches;
	this.setSpeed(reducedMotion ? 0 : DEFAULT_SPEED);

	this.canvas = $("#backdrop");
	this.context = this.canvas.getContext("2d");

	this.resizeCanvas();
	this.drawBackground();
};

Background.prototype.setSpeed = function(rate=DEFAULT_SPEED) {
	$("#speed").value = rate;
	this.rate = rate;
};

Background.prototype.changeSpeed = function(newValue=DEFAULT_SPEED) {
	const oldValue = this.rate;
	this.rate = newValue;

	if (oldValue == 0 && newValue > 0) {
		this.drawBackground(); // restarts animation
	}
};

Background.prototype.resizeCanvas = function() {
	const ratio = window.innerHeight / window.innerWidth;

	this.canvas.width = CANVAS_WIDTH;
	this.canvas.height = CANVAS_WIDTH * ratio;

	this.cx = this.canvas.width / 2;
	this.cy = this.canvas.height / 2;
};

Background.prototype.drawBackground = function() {
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

	drawInnerRing.call(this);
	drawOuterRing.call(this);

	this.deg += 0.1 * this.rate;
	this.deg %= 360;

	// uses cosine as easing function
	this.scale += 0.25 * this.rate * Math.cos(2 * Math.PI * (this.deg / 360));

	if (this.rate > 0) {
		window.requestAnimationFrame(this.drawBackground.bind(this));
	}

	function drawInnerRing() {
		this.context.lineWidth = INNER_RING_WIDTH;
		this.context.fillStyle = INNER_RING_COLOR;
		this.context.strokeStyle = INNER_RING_COLOR;

		const r = (this.canvas.height * INNER_RING_SCALE + this.scale) / 2;

		if (r <= 0) {
			return;
		}

		this.context.beginPath();
		this.context.arc(this.cx, this.cy, r, 0, 2 * Math.PI);
		this.context.stroke();
		this.context.closePath();

		const angle = (45 - this.deg) * Math.PI / 180; // moves counterclockwise
		const sx = r * Math.cos(angle);
		const sy = r * Math.sin(angle);

		this.context.beginPath();
		this.context.arc(this.cx + sx, this.cy + sy, r / 3, 0, 2 * Math.PI);
		this.context.closePath();
		this.context.fill();

		this.context.beginPath();
		this.context.arc(this.cx - sx, this.cy - sy, r / 6, 0, 2 * Math.PI);
		this.context.closePath();
		this.context.fill();
	}

	function drawOuterRing() {
		this.context.lineWidth = OUTER_RING_WIDTH;
		this.context.fillStyle = OUTER_RING_COLOR;
		this.context.strokeStyle = OUTER_RING_COLOR;

		const r = (this.canvas.height * OUTER_RING_SCALE - 2 * this.scale) / 2;

		if (r <= 0) {
			return;
		}

		this.context.beginPath();
		this.context.arc(this.cx, this.cy, r, 0, 2 * Math.PI);
		this.context.stroke();
		this.context.closePath();

		const angle = (135 + this.deg) * Math.PI / 180; // moves clockwise
		const sx = r * Math.cos(angle);
		const sy = r * Math.sin(angle);

		this.context.beginPath();
		this.context.arc(this.cx + sx, this.cy + sy, r / 6, 0, 2 * Math.PI);
		this.context.closePath();
		this.context.fill();

		this.context.fillStyle = BACKGROUND_COLOR;

		this.context.beginPath();
		this.context.arc(this.cx - sx, this.cy - sy, r / 4, 0, 2 * Math.PI);
		this.context.closePath();
		this.context.fill();
		this.context.stroke();
	}
};

/*
 * Storage prototype
 */

function Storage(name) {
	this.name = name;
}

Storage.prototype.load = function() {
	try {
		const contents = localStorage.getItem(this.name);

		if (contents != null) {
			return JSON.parse(contents);
		}
	} catch (err) {
		console.error(err);
		this.reset();
	}

	return {};
};

Storage.prototype.save = function(file) {
	try {
		if (file != undefined) {
			localStorage.setItem(this.name, JSON.stringify(file));
		} else {
			this.reset();
		}
	} catch (err) {
		console.error(err);
	}
};

Storage.prototype.reset = function() {
	try {
		localStorage.removeItem(this.name);
	} catch (err) {
		console.error(err);
	}
};