/*
 * Based on:
 * https://gist.github.com/datchley/37353d6a2cb629687eb9
 */

class EventEmitter {
	constructor() {
		this.listeners = {};
	}

	addListener(label, callback) {
		this.listeners[label] = this.listeners[label] || [];
		this.listeners[label].push(callback);
	}

	removeListener(label, callback) {
		let listeners = this.listeners[label],
			index;
		
		if (listeners && listeners.length) {
			index = listeners.reduce((i, listener, index) => {
				return (typeof listener === 'function' && listener === callback) ?
					i = index :
					i;
			}, -1);
			
			if (index > -1) {
				listeners.splice(index, 1);
				this.listeners[label] = listeners;
				return true;
			}
		}
		return false;
	}
	
	emit(label, ...args) {
		let listeners = this.listeners[label];
		
		if (listeners && listeners.length) {
			listeners.forEach((listener) => {
				listener(...args); 
			});
			return true;
		}
		return false;
	}
}

export default EventEmitter;