"use strict";

const { createCanvas } = require("node-canvas-webgl/lib");
global.THREE = require("three");
global.document = {
	createElement() {
		return createCanvas(300, 150);
	},
};

const path = require("path");
const Bot = require("./bot");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const bot = new Bot(
	{
		host: process.env.HOST ?? "localhost",
		port: process.env?.PORT ? parseInt(process.env?.PORT) : 25565,
		auth: process.env?.AUTH,
		username: process.env.USERNAME ?? "Timelapser",
		password: process.env?.PASSWORD,
		version: process.env?.VERSION,
		physicsEnabled: false,
	},
	{
		viewDistance: 16,
		width: 1000,
		height: 1000,
		outputDir: process.env.OUTPUT_DIR,
		interval: 10000,
		frames: -1,
	}
);
