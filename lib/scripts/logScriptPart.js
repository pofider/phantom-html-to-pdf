var messages = [];

console.log = function(m) {
    messages.push({ timestamp: new Date().getTime(), message: Array.prototype.join.call(arguments, ' '), level: 'debug'});
};

console.error = function(m) {
    messages.push({ timestamp: new Date().getTime(), message: Array.prototype.join.call(arguments, ' '), level: 'error'});
};
console.warn = function(m) {
    messages.push({ timestamp: new Date().getTime(), message: Array.prototype.join.call(arguments, ' '), level: 'warn'});
};