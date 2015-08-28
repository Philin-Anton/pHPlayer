/**
 * @author Anton.Filin
 */

"use strict";

function visualizationSong(analyser, canvas, options) {
    // TODO: all code refactoring
    var defaultOptions = {
        cwidth: canvas.width,
        cheight: canvas.height - 2,
        meterWidth: 10,
        capHeight: 2,
        capStyle: '#fff',
        meterNum: 800 / (10 + 2),
        capYPositionArray: []
    };

    options = options || defaultOptions;

    var ctx = canvas.getContext('2d'),
        gradient = ctx.createLinearGradient(0, 0, 0, 300),
        array = new Uint8Array(analyser.frequencyBinCount),
        step = Math.round(array.length / options.meterNum);

    gradient.addColorStop(1, '#0f0');
    gradient.addColorStop(0.5, '#ff0');
    gradient.addColorStop(0, '#f00');

    ctx.fillStyle = gradient;

    var requestVisualization = function (){
        analyser.getByteFrequencyData(array);
        ctx.clearRect(0, 0, options.cwidth, options.cheight);

        for (var i = 0; i < options.meterNum; i++) {
            var value = array[i * step];
            if (options.capYPositionArray.length < Math.round(options.meterNum)) {
                options.capYPositionArray.push(value);
            }
            ctx.fillStyle = options.capStyle;
            if (value < options.capYPositionArray[i]) {
                ctx.fillRect(i * 12, options.cheight - (--options.capYPositionArray[i]), options.meterWidth, options.capHeight);
            } else {
                ctx.fillRect(i * 12, options.cheight - value, options.meterWidth, options.capHeight);
                options.capYPositionArray[i] = value;
            }
            ctx.fillStyle = gradient;
            ctx.fillRect(i * 12 , options.cheight - value + options.capHeight, options.meterWidth, options.cheight);
        }
        requestAnimationFrame(requestVisualization);
    };
    requestVisualization();

}