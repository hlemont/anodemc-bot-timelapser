const { version: botVersion } = require("../package.json");

const mineflayer = require("mineflayer");
const path = require("path");

const Screenshot = require("./screenshot");
const { tellraw, jsonMessage, addBotPrefix, getTarget } = require("./util");
const { Vec3 } = require("vec3");

module.exports = class Bot {
	static #commandPrefixes = ["!timelapser", "!tl"];

	static #commandListStatic = [
		{
			name: ["startRecording", "start"],
			desc: "Start recording screenshots",
			args: [],
			run: function (username, args) {
				this.mineflayer.chat(
					tellraw(username, addBotPrefix("Start recording..."))
				);
				this.screenshot.start();
			},
		},
		{
			name: ["stopRecording", "stop"],
			desc: "Stop recording screenshots",
			args: [],
			run: async function (username, args) {
				this.mineflayer.chat(
					tellraw(username, addBotPrefix("Stop recording..."))
				);
				await this.screenshot.stop();
				this.mineflayer.chat(
					tellraw(username, addBotPrefix("Finished Recording!"))
				);
			},
		},
		{
			name: ["setPlayer", "player"],
			desc: "Set bot's position and rotation according to the target:\n [player, mob] <name>",
			args: ["type", "target"],
			run: async function (username, args) {
				const type = args.type ?? "player";
				const target =
					args.target ?? (type === "player" ? username : undefined);
				const entity = getTarget(this.mineflayer, type, target);
				this.mineflayer.chat(
					tellraw(
						username,
						addBotPrefix(`Setting bot position to ${target}...`)
					)
				);
				this.mineflayer.chat(
					`/tp ${this.mineflayer.username} ${entity.position
						.toArray()
						.join(" ")}`
				);
				await this.mineflayer.look(entity.yaw, entity.pitch);
				this.mineflayer.chat(
					tellraw(
						username,
						addBotPrefix(
							`Set player position at (${entity.position
								.toArray()
								.map((value) => value.toString().slice(0, 6))
								.join(", ")}) facing (${entity.yaw
								.toString()
								.slice(0, 6)} / ${entity.pitch.toString().slice(0, 6)}).`
						)
					)
				);
			},
		},
		{
			name: ["setCamera", "camera"],
			desc: "Set camera's position and rotation according to the target:\nabs <x>,<y>,<z>/<yaw>,<pitch> / [player, mob] <name>",
			args: ["type", "target"],
			run: function (username, args) {
				const type = args.type ?? "player";
				const target =
					args.target ?? (type === "player" ? username : undefined);
				let x, y, z, yaw, pitch;
				if (type === "abs") {
					//parse coordinates and rotation: x,y,z,/yaw,pitch
					[[x, y, z], [yaw, pitch]] = args.target
						.split("/")
						.map((_i) => _i.split(",").map(parseFloat));
				} else {
					const entity = getTarget(this.mineflayer, type, target);
					[x, y, z] = entity.position.toArray();
					[yaw, pitch] = [entity.yaw, entity.pitch];
				}
				this.mineflayer.chat(
					tellraw(
						username,
						addBotPrefix(`Setting camera position to ${target}...`)
					)
				);

				// when position and rotation are all set properly
				if (
					(x || x === 0) &&
					(y || y === 0) &&
					(z || z === 0) &&
					(yaw || yaw === 0) &&
					(pitch || pitch === 0)
				) {
					this.screenshot.setCamera(new Vec3(x, y, z), yaw, pitch);
					this.mineflayer.chat(
						tellraw(
							username,
							addBotPrefix(
								`Set camera position at (${x.toString().slice(0, 6)}, ${y
									.toString()
									.slice(0, 6)}, ${z.toString().slice(0, 6)}) facing (${yaw
									.toString()
									.slice(0, 6)} / ${pitch.toString().slice(0, 6)}).`
							)
						)
					);
				} else {
					this.mineflayer.chat(
						tellraw(
							username,
							addBotPrefix(
								`Failed to set camera position! (${type}, ${target})`
							)
						)
					);
				}
			},
		},
		{
			name: ["unsetCamera", "-camera"],
			desc: "Remove modified camera position and rotation",
			args: [],
			run: function (username, args) {
				this.mineflayer.chat(
					tellraw(username, addBotPrefix("Unsetting camera position..."))
				);
				this.screenshot.unsetCamera();
			},
		},
		{
			name: ["lookAt", "see"],
			desc: "Make bot look at the target: abs <x>,<y>,<z> / [player, mob] <name>",
			args: ["type", "target"],
			run: function (username, args) {
				const type = args.type ?? "player";
				const target =
					args.target ?? (type === "player" ? username : undefined);
				let x, y, z;
				if (args.type === "abs") {
					//parse coordinates: x,y,z
					[x, y, z] = args.target.split(",").map(parseFloat);
				} else {
					const entity = getTarget(this.mineflayer, type, target);
					if (entity) {
						[x, y, z] = entity.position.toArray();
					}
				}

				if ((x || x === 0) && (y || y === 0) && (z || z === 0)) {
					this.mineflayer.lookAt(new Vec3(x, y, z));
					this.mineflayer.chat(
						tellraw(
							username,
							addBotPrefix(
								`Now looking at (${[x, y, z]
									.map((_i) => _i.toString().slice(0, 6))
									.join(", ")})`
							)
						)
					);
				} else {
					this.mineflayer.chat(
						tellraw(
							username,
							addBotPrefix(
								`Failed to look at target! (${
									type === "abs" ? [x, y, z].join(", ") : target
								})`
							)
						)
					);
				}
			},
		},
	];

	static #commandListDynamic = [
		{
			name: ["help"],
			desc: "Display description or show for commands",
			args: ["target"],
			run: (function () {
				// generate messages
				const messages = Bot.#commandListStatic.reduce((prev, command) => {
					const name = command.name[0];
					const aliases = command.name.slice(1);
					const usage = command.args.map((arg) => "<" + arg + ">").join(" ");
					prev[name] = [
						jsonMessage(
							name +
								(aliases ? `(${aliases.join(",")})` : "") +
								(usage ? " " + usage : "") +
								":",
							{
								hoverEvent: {
									action: "show_text",
									value: `run ${name}`,
								},
								clickEvent: {
									action: "suggest_command",
									value: Bot.#commandPrefixes[0] + " " + name,
								},
							}
						),
						jsonMessage(command.desc, { italic: true, color: "gray" }),
						"",
					];
					return prev;
				}, {});
				return function (username, args) {
					if (args.target) {
						if (args.target in messages) {
							this.mineflayer.chat(tellraw(username, messages[args.target]));
						} else {
							this.mineflayer.chat(
								tellraw(username, addBotPrefix(`Command not found: ${target}`))
							);
						}
					} else {
						Object.keys(messages).map((name) => {
							const message = messages[name];
							message.map((line) => {
								this.mineflayer.chat(tellraw(username, line));
							});
						});
					}
				};
			})(),
		},
	];

	static #startMessages = [
		`Version: ${botVersion}`,
		"Hello, world!",
		[
			"Type '",
			jsonMessage("!timelapser help", {
				clickEvent: {
					action: "suggest_command",
					value: "!timelapser help",
				},
			}),
			"' or '",
			jsonMessage("!tl help", {
				clickEvent: {
					action: "suggest_command",
					value: "!tl help",
				},
			}),
			"' to see command usage.",
		],
	];
	static #defaultMineflayerOptions = {
		host: "localhost",
		port: 25565,
		username: "Timelapser",
		physicsEnabled: false,
	};
	static #defaultScreenshotOptions = {
		outputDir: process.env.OUTPUT_DIR,
		interval: 10000,
	};

	#mineflayerOptions;
	#screenshotOptions;
	#commands;

	static #parseUserMessage(message) {
		const multipleSpacesRemoved = message.trim().replace(/  +/g, " ");
		const parsed = multipleSpacesRemoved.split(" ");
		const [prefix, name] = parsed;
		const args = parsed.slice(2);

		// check if the prefix is in the list
		if (!Bot.#commandPrefixes.includes(prefix)) return undefined;
		return { name, args };
	}

	constructor(mineflayerOptions = {}, screenshotOptions = {}) {
		// merge default option with given options, and save as instance field
		this.#mineflayerOptions = {
			...Bot.#defaultMineflayerOptions,
			...mineflayerOptions,
		};
		this.#screenshotOptions = {
			...Bot.#defaultScreenshotOptions,
			...screenshotOptions,
		};
		this.#initCommands();
		this.#initMineflayer()
			.then(() => this.#initScreenshot())
			.then(() => {
				this.#sendStartMessages();
				this.mineflayer.on("chat", this.#handleChatMessage.bind(this));
			});
	}

	#initCommands() {
		const commandList = [...Bot.#commandListStatic, ...Bot.#commandListDynamic];
		this.commands = commandList.reduce((prev, command) => {
			let { name, args: argsList, run } = command;
			run = run.bind(this);
			// initialize functions
			const func = (username, args) => {
				// map arguments to keyword arguments sequentially
				const kwargs = argsList.reduce((prev, arg, index) => {
					prev[arg] = args[index];
					return prev;
				}, {});
				run(username, kwargs);
			};
			name.map((name) => {
				prev[name] = func;
			});
			return prev;
		}, {});

		console.log("commands", this.commands);
	}

	async #initMineflayer() {
		return new Promise(
			function (resolve, reject) {
				this.mineflayer = mineflayer.createBot(this.#mineflayerOptions);

				/* handling events */
				this.mineflayer.once(
					"spawn",
					function () {
						this.mineflayer.creative.startFlying();
						resolve();
					}.bind(this)
				);
				this.mineflayer.once(
					"end",
					async function () {
						await this.#initMineflayer();
						if (this.screenshot) {
							this.screenshot.load(this.mineflayer);
						} else {
							this.#initScreenshot();
						}
						this.mineflayer.on("chat", this.#handleChatMessage.bind(this));
					}.bind(this)
				);
				this.mineflayer.once("error", reject);
			}.bind(this)
		);
	}

	async #initScreenshot() {
		this.screenshot = new Screenshot(this.#screenshotOptions);
		await this.screenshot.load(this.mineflayer);
	}

	#sendStartMessages() {
		Bot.#startMessages.map((message) =>
			console.log(tellraw("@a", addBotPrefix(message)))
		);

		Bot.#startMessages.map((message) =>
			this.mineflayer.chat(tellraw("@a", addBotPrefix(message)))
		);
	}

	#handleChatMessage(username, message) {
		const { name, args } = Bot.#parseUserMessage(message) || {};
		if (name in this.commands) {
			this.commands[name](username, args);
		}
	}
};
