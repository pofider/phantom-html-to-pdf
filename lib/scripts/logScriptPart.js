var messages = [];

function trimMessage(pars) {
    var message = Array.prototype.join.call(pars, ' ')

    // this is special case, because phantom logs base64 images content completely into the output
    if (message.indexOf('Request data:image') === 0 && message.length > 100) {
        return message.substring(0, 100) + '...';
    }

    if (message.length > maxLogEntrySize) {
        return message.substring(0, maxLogEntrySize) + '...';
    }

    return message;
};

console.log = function(m) {
    messages.push({ timestamp: new Date().getTime(), message: trimMessage(arguments), level: 'debug'});
};

console.error = function(m) {
    messages.push({ timestamp: new Date().getTime(), message: trimMessage(arguments), level: 'error'});
};
console.warn = function(m) {
    messages.push({ timestamp: new Date().getTime(), message: trimMessage(arguments), level: 'warn'});
};