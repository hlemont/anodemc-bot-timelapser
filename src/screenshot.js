"use strict";
const {
	mineflayer: mineflayerViewer,
	viewer: { Viewer, WorldView },
} = require("prismarine-viewer");
const { createCanvas } = require("node-canvas-webgl/lib");
const Vec3 = require("vec3");
const fs = require("fs");
const path = require("path");
const { getBufferFromStream } = require("prismarine-viewer/viewer");

module.exports = class Screenshot {
	constructor(bot, options) {
		this.bot = bot;
		this.options = {
			viewDistance: options.viewDistance ?? 4,
			cameraPosition: options?.cameraPosition,
			cameraYaw: options?.cameraYaw,
			cameraPitch: options?.cameraPitch,
			width: options.width ?? 512,
			height: options.height ?? 512,
			outputDir: options.outputDir ?? path.join(__dirname, "../output"),
			interval: options.interval ?? 60000,
			frames: options.frames ?? -1,
		};
		this.count = 0;
		this.onStopping = [];
		this.isRecording = false;

		this.canvas = createCanvas(this.options.width, this.options.height);
		this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
		this.viewer = new Viewer(this.renderer);

		this.viewer.setVersion(this.bot.version);
		this.viewer.setFirstPersonCamera(
			this.options.cameraPosition || this.bot.entity.position,
			this.options.cameraYaw || this.bot.entity.yaw,
			this.options.cameraPitch || this.bot.entity.pitch
		);

		// loading a remote world from bot
		this.worldView = new WorldView(
			this.bot.world,
			this.options.viewDistance,
			this.bot.entity.position
		);
		this.viewer.listen(this.worldView);
		this.worldView.init(bot.entity.position);

		// register events, loops
		this.bot.on("move", this.applyBotPosition.bind(this));
		this.worldView.listenToBot(this.bot);
	}

	applyBotPosition() {
		// this.bot.chat("sex");
		const entity = this.bot?.entity;
		if (entity) {
			this.viewer.setFirstPersonCamera(
				this.options.cameraPosition || entity.position,
				this.options.cameraYaw || entity.yaw,
				this.options.cameraPitch || entity.pitch
			);
			this.worldView.updatePosition(entity.position);
		}
	}

	start(callback) {
		if (this.isRecording) return;
		this.isRecording = true;
		this.loop = setInterval(this.update.bind(this), this.options.interval);
		this.bot.on("end", this.stop);

		this.onStopping = callback;
	}

	stop() {
		this.isRecording = false;
		clearInterval(this.loop);
		if (this.onStopping) {
			this.onStopping();
			this.onStopping = undefined;
		}
	}

	setCamera(cameraPosition, cameraYaw, cameraPitch) {
		this.options.cameraPosition = cameraPosition;
		this.options.cameraYaw = cameraYaw;
		this.options.cameraPitch = cameraPitch;
	}

	unsetCamera() {
		this.options.cameraPosition = undefined;
		this.options.cameraYaw = undefined;
		this.options.cameraPitch = undefined;
	}

	async update() {
		if (this.options.frames !== -1 && this.count > this.options.frames) {
			this.stop();
		}
		this.count++;

		const date = new Date();
		// 2021-07-27_17-39-27.jpg
		const filename = `${date.getFullYear()}-${date
			.getMonth()
			.toString()
			.padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}_${date
			.getHours()
			.toString()
			.padStart(2, "0")}-${date.getMinutes().toString().padStart(2, "0")}-${date
			.getSeconds()
			.toString()
			.padStart(2, "0")}.png`;
		this.viewer.update();
		this.renderer.render(this.viewer.scene, this.viewer.camera);

		const imageStream = this.canvas.createPNGStream({
			compressionLevel: 0,
			palette: undefined,
			backgroundIndex: 0,
			resolution: undefined,
		});

		const buf = await getBufferFromStream(imageStream);
		fs.writeFile(path.join(this.options.outputDir, filename), buf, () =>
			console.log(`saved file ${filename} in ${this.options.outputDir}.`)
		);
	}
};
