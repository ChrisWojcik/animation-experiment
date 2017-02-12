// Function to test if an object is a plain object, i.e. is constructed
// by the built-in Object constructor and inherits directly from Object.prototype
// or null. Some built-in objects pass the test, e.g. Math which is a plain object
// and some host or exotic objects may pass also.
export const isPlainObject = function(obj) {

    // Basic check for Type object that's not null
    if (typeof obj == 'object' && obj !== null) {

        // If Object.getPrototypeOf supported, use it
        if (typeof Object.getPrototypeOf == 'function') {
            var proto = Object.getPrototypeOf(obj);
            return proto === Object.prototype || proto === null;
        }

        // Otherwise, use internal class
        // This should be reliable as if getPrototypeOf not supported, is pre-ES5
        return Object.prototype.toString.call(obj) == '[object Object]';
    }

    // Not an object
    return false;
};

// Produce an array that contains every item shared between all the passed-in arrays.
export const intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = array.length; i < length; i++) {
        var item = array[i];
        if (result.indexOf(item) !== -1) continue;
        for (var j = 1; j < argsLength; j++) {
            if (arguments[j].indexOf(item) === -1) break;
        }
        if (j === argsLength) result.push(item);
    }
    return result;
};