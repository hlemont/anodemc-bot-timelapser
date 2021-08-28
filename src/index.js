"use strict";

const { createCanvas } = require("node-canvas-webgl/lib");
global.THREE = require("three");
global.document = {
	createElement() {
		return createCanvas(300, 150);
	},
};

const { version } = require("../package.json");
const mineflayer = require("mineflayer");
const Vec3 = require("vec3");
const path = require("path");
const Screenshot = require("./screenshot");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

let bot;

let screenshot;

const addBotPrefix = (message) => "[Timelapser] " + message;

const commandList = {
	help: {
		description: "display helps for commands",
		args: [],
		run: (username, args) => {
			bot.chat(tellraw(username, addBotPrefix(`version ${version}`)));
			bot.chat(tellraw(username, "!timelapse or !tl"));
			Object.keys(commandList).map((key) => {
				bot.chat(
					tellraw(
						username,
						`... ${[
							key,
							...commandList[key].args.map((arg) => `<${arg}>`),
						].join(" ")}: ${commandList[key].description}`
					)
				);
			});
		},
	},
	start: {
		description: "start recording from the sight of <at>",
		args: ["at"],
		run: (username, args) => {
			bot.chat(tellraw(username, addBotPrefix("Starting recording...")));
			const target = args?.at;
			if (target) {
				const entity =
					target.toLowerCase() === bot.username.toLowerCase()
						? bot.entity
						: bot.nearestEntity(
								(entity) =>
									entity.type === "player" &&
									entity.username.toLowerCase() === target.toLowerCase()
						  );
				screenshot.setCamera(
					new Vec3(entity.position.x, entity.position.y, entity.position.z),
					entity.yaw,
					entity.pitch
				);
			}
			screenshot.start(() => {
				bot.chat(tellraw(username, addBotPrefix("Finished Recording!")));
			});
		},
	},
	stop: {
		description: "stop recording",
		args: [],
		run: (username, args) => {
			bot.chat(tellraw(username, addBotPrefix("Stopping recording...")));
			screenshot.stop();
		},
	},
	setPlayer: {
		description:
			"set bot's position and rotation according to the player. default: you",
		args: ["at"],
		run: async (username, args) => {
			const target = args.at ?? username;
			bot.chat(
				tellraw(username, addBotPrefix(`Setting bot position to ${target}...`))
			);
			bot.chat(`/tp ${target}`);

			const entity =
				target.toLowerCase() === bot.username.toLowerCase()
					? bot.entity
					: bot.nearestEntity(
							(entity) =>
								entity.type === "player" &&
								entity.username.toLowerCase() === target.toLowerCase()
					  );
			await bot.look(entity.yaw, entity.pitch);
		},
	},
	setCamera: {
		description:
			"set camera's position and rotation according to the player. default: you",
		args: ["at"],
		run: (username, args) => {
			const target = args.at ?? username;
			const entity =
				target.toLowerCase() === bot.username.toLowerCase()
					? bot.entity
					: bot.nearestEntity(
							(entity) =>
								entity.type === "player" &&
								entity.username.toLowerCase() === target.toLowerCase()
					  );
			bot.chat(
				tellraw(
					username,
					addBotPrefix(`Setting camera position to ${target}...`)
				)
			);
			screenshot.setCamera(
				new Vec3(entity.position.x, entity.position.y, entity.position.z),
				entity.yaw,
				entity.pitch
			);
		},
	},
	unsetCamera: {
		description: "remove camera position and rotation modification",
		args: [],
		run: (username, args) => {
			bot.chat(tellraw(username, addBotPrefix(`Unsetting camera position...`)));
			screenshot.unsetCamera();
		},
	},
	lookAt: {
		description:
			"make bot look at the target. block <x>,<y>,<z> / player <username> / mob <name>",
		args: ["type", "target"],
		run: async (username, args) => {
			let position;
			if (args.type === "block") {
				const coords = args.target.split(",").map((value) => parseInt(value));
				console.log(args.data, args.target.split(","), coords);
				if (coords.length >= 3) {
					position = new Vec3(...coords);
				} else {
					position = undefined;
				}
			} else if (args.type === "player") {
				const entity = bot.nearestEntity(
					(entity) =>
						entity.type === "player" &&
						entity.username.toLowerCase() ===
							(args?.target ?? username).toLowerCase()
				);
				position = entity ? entity.position.offset(0, 1, 0) : undefined;
			} else if (args.type === "mob") {
				const entity = bot.nearestEntity(
					(entity) =>
						entity.type === "mob" &&
						(!args.target ||
							entity.name.toLowerCase() === args.target.toLowerCase())
				);
				position = entity ? entity.position : undefined;
			}

			if (position) {
				await bot.lookAt(position);
			}
		},
	},
};

const commandObject = {
	bot,
	init: function () {
		console.log("init");
		console.log(commandList);
		return Object.keys(commandList).reduce((prev, key) => {
			console.log(key);
			if (key.startsWith("_")) return prev;
			const command = commandList[key];
			prev[key] = (username, args) => {
				const _args = command.args.reduce((prev, key, index) => {
					prev[key] = args[index];
					return prev;
				}, {});
				command.run(username, _args);
			};
			return prev;
		}, {});
	},
};

function tellraw(target, jsonMessages) {
	return `/tellraw ${target} ${JSON.stringify(jsonMessages)}`;
}

function jsonMessage(message, options) {
	return { text: message, ...options };
}

bot = mineflayer.createBot({
	host: process.env.HOST ?? "localhost",
	port: process.env?.PORT ? parseInt(process.env?.PORT) : "25565",
	auth: process.env?.AUTH,
	username: process.env.USERNAME ?? "Timelapser",
	password: process.env?.PASSWORD,
	version: process.env?.VERSION,
});

bot.once("spawn", () => {
	bot.creative.startFlying();
	screenshot = new Screenshot(bot, {
		viewDistance: 32,
		width: 1280,
		height: 720,
		outputDir: process.env.OUTPUT_DIR,
		interval: 10000,
		frames: -1,
	});

	bot.chat(tellraw("@a", addBotPrefix("Hello, world!")));
	bot.chat(
		tellraw(
			"@a",
			addBotPrefix('type "!timelapser help" or "!tl help" to see help')
		)
	);
	const commands = commandObject.init();

	bot.on("chat", (username, message) => {
		const parsed = message.trim().replace(/  +/g, " ").split(" ");
		// check for command id
		if (!(parsed[0] === "!timelapser" || parsed[0] === "!tl")) return;
		const commandName = parsed[1];
		const args = parsed.slice(2);
		bot.chat(
			tellraw(
				"@a",
				`[debug] commandName: ${commandName}, args: ${JSON.stringify(args)}`
			)
		);
		// only when the command exists
		if (!(commandName in commands)) return;

		commands[commandName](username, args);
	});
});
