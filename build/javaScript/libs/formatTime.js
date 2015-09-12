/**
 * @author Anton.Filin
 */
(function () {
    'use strict';
    window.formatTime = function(seconds) {
        var minutes;
        minutes = Math.floor(seconds / 60);
        minutes = (minutes >= 10) ? minutes : "0" + minutes;
        seconds = Math.floor(seconds % 60);
        seconds = (seconds >= 10) ? seconds : "0" + seconds;
        return minutes + ":" + seconds;
    };
})();

