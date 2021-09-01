const addBotPrefix = (message) => ["[Timelapser] ", message];

function tellraw(target, jsonMessages) {
	return `/tellraw ${target} ${JSON.stringify(jsonMessages)}`;
}

function jsonMessage(message, options) {
	return { text: message, ...options };
}

function getTarget(bot, type, target) {
	const entity = bot.nearestEntity((entity) => {
		let name = entity.type === "player" ? entity.username : entity.name;
		return (
			entity.type === type &&
			(target ? name.toLowerCase() === target.toLowerCase() : true)
		);
	});
	console.log(
		`got target ${(entity.position.toString(), entity.yaw, entity.pitch)}`
	);
	return entity;
}

module.exports = {
	addBotPrefix,
	tellraw,
	jsonMessage,
	getTarget,
};
