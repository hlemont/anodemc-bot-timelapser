"use strict";
const {
	viewer: { Viewer, WorldView },
} = require("prismarine-viewer");
const { createCanvas } = require("node-canvas-webgl/lib");
const fs = require("fs");
const path = require("path");
const { getBufferFromStream } = require("prismarine-viewer/viewer");

module.exports = class Screenshot {
	constructor(options) {
		this.options = {
			viewDistance: options.viewDistance ?? 16,
			width: options.width ?? 1280,
			height: options.height ?? 720,
			fov: options.fov ?? 90,
			outputDir: options.outputDir ?? path.join(__dirname, "../output"),
			interval: options.interval ?? 60000,
			frames: options.frames ?? -1,
		};

		this.canvas = createCanvas(this.options.width, this.options.height);
		this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
	}

	async load(bot) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		// initialize viewer
		this.viewer = new Viewer(this.renderer);
		this.viewer.setVersion(bot.version);
		this.viewer.setFirstPersonCamera(
			this.camera?.position ?? bot.entity.position ?? undefined,
			this.camera?.yaw ?? bot.entity.yaw ?? undefined,
			this.camera?.pitch ?? bot.entity.pitch ?? undefined
		);
		this.viewer.camera.fov = this.options.fov;

		// loading a remote world from bot
		this.worldView = new WorldView(
			bot.world,
			this.options.viewDistance,
			bot.entity.position
		);
		this.viewer.listen(this.worldView);
		await this.worldView.init(bot.entity.position);

		// register events, loops
		bot.on("move", this.applyBotPosition(bot).bind(this));
		this.worldView.listenToBot(bot);
	}

	applyBotPosition(bot) {
		const entity = bot.entity;
		return function () {
			this.viewer.setFirstPersonCamera(
				this.camera?.position ?? entity.position ?? undefined,
				this.camera?.yaw ?? entity.yaw ?? undefined,
				this.camera?.pitch ?? entity.pitch ?? undefined
			);
			this.worldView.updatePosition(entity.position);
		};
	}

	setCamera(position, yaw, pitch) {
		this.camera = {
			position,
			yaw,
			pitch,
		};
	}

	unsetCamera() {
		this.camera = undefined;
	}

	setOptions(options) {
		this.options = { ...this.options, ...options };
	}

	start() {
		this.idx = 0;
		this.update();
		this.loop = setInterval(this.update.bind(this), this.options.interval);
	}

	stop() {
		return new Promise((resolve) => {
			clearInterval(this.loop);
			resolve();
		});
	}

	async update() {
		if (this.idx > this.options.frames && this.options.frames !== -1) {
			this.stop();
			return;
		}
		this.idx++;

		// filename with datetime example: 2021-07-27_17-39-27.jpg
		const date = new Date();
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
			compressionLevel: 6,
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
