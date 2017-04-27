var fs = require('fs'),
    firstEvent = require('ee-first');

module.exports = function removeTempFileWhenConsumed(filepath, fileStream) {
  var thunk = firstEvent([
    [fileStream, 'close', 'end', 'error']
  ], function(err, stream, eventName, args) {
    var shouldPropagateStreamError = false;

    if (err || eventName === 'error') {
      // if there is only one listener for the 'error' event (our handler)
      // we should propagate the error,
      // if there is more than one listener it means that the user is listening for the event 'error'
      // in the stream, so it's user responsibility to handle the error correctly
      if (fileStream.listeners('error').length === 1) {
        shouldPropagateStreamError = true;
      }
    }

    // clean up event listeners on stream after the callback has been executed
    thunk.cancel();

    // clean up temp file
    deleteFile(filepath);

    if (shouldPropagateStreamError) {
      fileStream.emit('error', err);
    }
  });
};

function deleteFile(filepath) {
  fs.unlink(filepath, function() { /* ignore any error when deleting the file */ });
}
