'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var Engine = {
	windowWidth: window.innerWidth,
	windowHeight: window.innerHeight,
	runningAnimations: [],
	queuedActions: [],
	transformStyleProp: getPrefix('transform')
};

var lastTick = -1;

// Global handler for resize events
function handleResize() {
	Engine.windowWidth = window.innerWidth;
	Engine.windowHeight = window.innerHeight;
}

function stepAnimations(time) {
	if (lastTick === -1) lastTick = time;
	var i = void 0,
	    l = void 0;

	for (i = 0, l = Engine.runningAnimations.length; i < l; i++) {
		Engine.runningAnimations[i].tick(time - lastTick);
		Engine.runningAnimations[i].render();
	}

	for (i = 0, l = Engine.queuedActions.length; i < l; i++) {
		Engine.queuedActions.shift()();
	}

	Engine.runningAnimations = Engine.runningAnimations.filter(function (animation) {
		return animation.running;
	});
	lastTick = time;
	window.requestAnimationFrame(stepAnimations);
}

function getPrefix(prop) {
	var styles = document.createElement('p').style;
	var vendors = ['ms', 'O', 'Moz', 'Webkit'];

	if (styles[prop] === '') return prop;
	prop = prop.charAt(0).toUpperCase() + prop.slice(1);

	for (var i = vendors.length; i--;) {
		if (styles[vendors[i] + prop] === '') {
			return vendors[i] + prop;
		}
	}
}

window.addEventListener('resize', handleResize, false);
window.requestAnimationFrame(stepAnimations);

exports.default = Engine;