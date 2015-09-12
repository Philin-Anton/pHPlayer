(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"D:\\work\\pHPlayer\\app\\javaScript\\main.js":[function(require,module,exports){
/**
 * @author Anton.Filin
 */

(function (global, factory) {
    /* TODO: Add AMD */
    global.PHPlayerInit = factory();
})
(window, function(){
    "use strict";
    function PHPlayerInit (element){
        var AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext;
        this.context = new (AudioContext)();
        if(!this.context) return;
        this.$ = window.$;
        this._ = window._;
        this.el = element;
        this.tempListSong = [];
        this.playerControl = this.el.querySelector('#playerControl');
        this.playerList = this.el.querySelector('#playerList');
        this.playerRange = this.el.querySelector('#playerRange');
        this.playerPlay = this.el.querySelector('#playerPlay');
        this.playerPause = this.el.querySelector('#playerPause');
        this.playerTimer = this.el.querySelector('#playerTimer');
        this.playerMetaData = this.el.querySelector('#playerMetaData');
        this.playerCanvas = this.el.querySelector('#playerCanvas');
        this.addEvents();
    }

    PHPlayerInit.prototype.addEvents = function() {
        this.playerPlay.addEventListener('click', this.onPlay.bind(this));
        this.playerPause.addEventListener('click', this.onPause.bind(this));
        this.playerList.addEventListener('click', this.onPlayListClick.bind(this));
        this.playerRange.addEventListener('mousedown', this.onPlayerRangeMouseDown.bind(this));
        this.playerRange.addEventListener('change', this.onPlayerRangeChange.bind(this));
        this.playerList.addEventListener("drop", this.onDrop.bind(this));
        this.playerList.addEventListener("dragover", this.onDragOver.bind(this));
        this.playerList.addEventListener("dragleave", this.onDragLeave.bind(this));
    };

    PHPlayerInit.prototype.onPlay = function(){
        if(this.isPlay()){ return true; }
        this.play();
    };
    PHPlayerInit.prototype.onPlayerRangeMouseDown = function(){
        this.pause();
    };
    PHPlayerInit.prototype.onPlayerRangeChange = function(){
        this.progressSongTime = +this.playerRange.value;
        this.play();
    };
    PHPlayerInit.prototype.onPause = function(){
        this.pause();
    };
    PHPlayerInit.prototype.delegationEvent = function(elem, selector){
        var matchesSelector = elem.matches || elem.webkitMatchesSelector || elem.mozMatchesSelector || elem.msMatchesSelector;
        while (elem) {
            if (matchesSelector.bind(elem)(selector)) return elem;
            elem = elem.parentElement;
        }
        return false;
    };

    PHPlayerInit.prototype.onPlayListClick = function(e){
        var itemSong = ( e.target || e  ).closest('.itemSong') || this.delegationEvent( e.target || e , '.itemSong');
        if(!itemSong) return false;

        if(!!this.thisElemlist) this.thisElemlist.removeAttribute('id');
        this.thisElemlist = itemSong;
        this.thisElemlist.id = 'play';

        this.idSong = this.thisElemlist.dataset.id;
        this.songUse = this.tempListSong[this.idSong];
        if(this.songUse.buffer == (this.source && this.source.buffer)){ return true; }
        this.progressSongTime = 0;
        this.play();

        var createFullNameSong = this.songUse.songFile.name.split('.');
        createFullNameSong.splice(-1, 1);
        this.playerControl.querySelector('.fullNameSong').innerText =  createFullNameSong.join('');

        this.playerMetaData.innerHTML = this.metaDataFrame = '';
        for(var method in this.songUse.metaData){
            if(!this.songUse.metaData.hasOwnProperty(method)) continue;
            if((!isNaN(parseFloat(this.songUse.metaData[method])) && isFinite(this.songUse.metaData[method])) || isNaN(this.songUse.metaData[method]))
                this.metaDataFrame += '<div class="' + method + '">' + method + ': ' + this.songUse.metaData[method] + '</div>';
        }
        this.playerMetaData.innerHTML = this.metaDataFrame;
    };

    PHPlayerInit.prototype.onDrop =  function(event){
        var songs = event.dataTransfer.files;
        if(!songs) return false;
        this.playerList.className = 'onDrop';
        /*TODO: refactoring code*/
        this.renderProgressBar(songs);
        this.renderList(songs, function(){
            this.$.get('templates/listSong.html', function(template_text){
                window.console.log(this.tempListSong);
                this.$("#playerList").html( this._.template(template_text)({items: this.tempListSong}));
            }.bind(this));
        }.bind(this));
        /**/
        event.preventDefault();
    };

    PHPlayerInit.prototype.onDragLeave = function(event){
        this.playerList = this.playerList.closest('#playerList') || this.delegationEvent(this.playerList, '#playerList');
        this.playerList.className = 'onDragLeave';
        event.stopPropagation();
        event.preventDefault();
    };

    PHPlayerInit.prototype.onDragOver = function(event){
        this.playerList = this.playerList.closest('#playerList') || this.delegationEvent(this.playerList, '#playerList');
        this.playerList.className = 'onDragOver';
        event.stopPropagation();
        event.preventDefault();
    };

    PHPlayerInit.prototype.loadMedia = function(song){
        /*TODO: refactoring code*/
        var dfd = this.$.Deferred();

        if(typeof song !== "string"){
            var reader = new window.FileReader();
            reader.readAsArrayBuffer(song);
            reader.onload = function (e){
                this.args = this.$.makeArray(arguments);
                this.decode(e.target.result, song, dfd);
            }.bind(this);
        }else{
            var xhr = new window.XMLHttpRequest();
            xhr.open('GET', song, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function() {
                this.decode(xhr.response, dfd);
            }.bind(this);
            xhr.send();
        }

        return dfd.promise();
    };

    PHPlayerInit.prototype.decode = function(arrayBuffer, song, dfd){
        var dv = new window.jDataView(arrayBuffer);
        var songFile = song;
        var metaData = {};
        if (dv.getString(3, dv.byteLength - 128) == 'TAG') {
            metaData = {
                nameSong: dv.getString(30, dv.tell()),
                artist: dv.getString(30, dv.tell()),
                album: dv.getString(30, dv.tell()),
                year: dv.getString(4, dv.tell())
            };
        }

        this.context.decodeAudioData(arrayBuffer, function( audioBuffer ) {
            this.buffer = audioBuffer;
            this.args.push(dfd.resolve);
            this.tempListSong.push({
                metaData: metaData,
                buffer: this.buffer,
                songFile: songFile
            });
            dfd.resolve(audioBuffer);
        }.bind(this));

    };

    /*TODO: refactoring code*/
    PHPlayerInit.prototype.renderProgressBar = function(songs){
        this.progressBarLength = 100/songs.length;
        this.playerList.innerHTML = "<div id='progressBar' style='width: 0'><span>Loading...</span></div>";
        this.playerList.children[0].style.width = this.progressBarLength * 1+'%';
    };
    /**/
    PHPlayerInit.prototype.play = function(){
        this.connect();
        this.start();
    };

    PHPlayerInit.prototype.connect = function(){
        this.pause();
        this.initPlayerRange();
        this.checkTimeCounter();

        this.source = this.context.createBufferSource();
        this.analyser = this.context.createAnalyser();
        this.destination = this.context.destination;
        this.currentTime = this.context.currentTime.toFixed(0);
        this.source.buffer = this.songUse.buffer;
        this.analyser.connect(this.destination);
        this.source.connect(this.analyser);
        this.source.connect(this.destination);

        window.visualizationSong(this.analyser, this.playerCanvas);
    };

    PHPlayerInit.prototype.initPlayerRange = function(){
        this.minRange = '0';
        this.maxRange = this.songUse.buffer.duration;
        this.playerRange.setAttribute('min', this.minRange);
        this.playerRange.setAttribute('max', this.maxRange);
    };

    PHPlayerInit.prototype.checkTimeCounter = function(){
        var time = this.progressSongTime;
        window.clearInterval(this.counter);
        this.cycleSong();
        this.playerTimer.innerHTML = window.formatTime(this.progressSongTime);
        this.counter = window.setInterval(function(){
            var counter =  +this.context.currentTime.toFixed(0) - this.currentTime + time;
            this.progressSongTime = ( counter >= this.songUse.buffer.duration ) ? this.progressSongTime : counter;
            this.playerTimer.innerHTML = window.formatTime(this.progressSongTime);
            this.playerRange.value = this.progressSongTime;
        }.bind(this), 100);
    };

    PHPlayerInit.prototype.cycleSong = function(){
        /*TODO: deleted*/
        this.isCycleSong = true;
        /*--*/
        window.clearTimeout(this.nextSong);
        this.nextSong = window.setTimeout(function(){ // TODO: find a way to switch to the inactive tab without "setTimeout"
            if(!this.isCycleSong) return false;
            if(this.tempListSong.length-1<=this.idSong) {
                this.onPlayListClick(this.thisElemlist.parentElement.children[0]) ;
                return true;
            }
            this.onPlayListClick(this.thisElemlist.nextElementSibling);
        }.bind(this), (this.songUse.buffer.duration - this.progressSongTime)*1000);
    };

    PHPlayerInit.prototype.isPause = function(){
        return (this.source && this.source.stop);
    };

    PHPlayerInit.prototype.isPlay = function(){
        return !!this.source;
    };

    PHPlayerInit.prototype.start = function(){
        if(!this.isPause()) return;
        this.source.start(this.context.currentTime, this.progressSongTime);
    };

    PHPlayerInit.prototype.pause = function(){
        if(!this.isPlay()) return;
        window.clearInterval(this.counter);
        window.clearTimeout(this.nextSong);
        this.source.stop(0);
        this.source = null;
    };

    PHPlayerInit.prototype.renderList = function (songs, callback) {
        /*TODO: refactoring code*/
        var $ = this.$;
        $.when.apply($, $.map($.makeArray(songs), function(song) {
            return this.loadMedia(song).then(function(){
                window.console.log(this.tempListSong);
                this.playerList.children[0].style.width = this.progressBarLength * (this.tempListSong.length + 1) + '%';
            }.bind(this));
        }.bind(this))).then(callback);
    };

    return PHPlayerInit;
});

window.document.ready = window.document.addEventListener("DOMContentLoaded", function() {
    new window.PHPlayerInit(window.document.querySelector('#pHPlayer'));
});
},{}]},{},["D:\\work\\pHPlayer\\app\\javaScript\\main.js"])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvamF2YVNjcmlwdC9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcclxuICogQGF1dGhvciBBbnRvbi5GaWxpblxyXG4gKi9cclxuXHJcbihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XHJcbiAgICAvKiBUT0RPOiBBZGQgQU1EICovXHJcbiAgICBnbG9iYWwuUEhQbGF5ZXJJbml0ID0gZmFjdG9yeSgpO1xyXG59KVxyXG4od2luZG93LCBmdW5jdGlvbigpe1xyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICBmdW5jdGlvbiBQSFBsYXllckluaXQgKGVsZW1lbnQpe1xyXG4gICAgICAgIHZhciBBdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQgfHwgd2luZG93Lm1vekF1ZGlvQ29udGV4dCB8fCB3aW5kb3cub0F1ZGlvQ29udGV4dCB8fCB3aW5kb3cubXNBdWRpb0NvbnRleHQ7XHJcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gbmV3IChBdWRpb0NvbnRleHQpKCk7XHJcbiAgICAgICAgaWYoIXRoaXMuY29udGV4dCkgcmV0dXJuO1xyXG4gICAgICAgIHRoaXMuJCA9IHdpbmRvdy4kO1xyXG4gICAgICAgIHRoaXMuXyA9IHdpbmRvdy5fO1xyXG4gICAgICAgIHRoaXMuZWwgPSBlbGVtZW50O1xyXG4gICAgICAgIHRoaXMudGVtcExpc3RTb25nID0gW107XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJDb250cm9sID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCcjcGxheWVyQ29udHJvbCcpO1xyXG4gICAgICAgIHRoaXMucGxheWVyTGlzdCA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignI3BsYXllckxpc3QnKTtcclxuICAgICAgICB0aGlzLnBsYXllclJhbmdlID0gdGhpcy5lbC5xdWVyeVNlbGVjdG9yKCcjcGxheWVyUmFuZ2UnKTtcclxuICAgICAgICB0aGlzLnBsYXllclBsYXkgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNwbGF5ZXJQbGF5Jyk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJQYXVzZSA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignI3BsYXllclBhdXNlJyk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJUaW1lciA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignI3BsYXllclRpbWVyJyk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJNZXRhRGF0YSA9IHRoaXMuZWwucXVlcnlTZWxlY3RvcignI3BsYXllck1ldGFEYXRhJyk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJDYW52YXMgPSB0aGlzLmVsLnF1ZXJ5U2VsZWN0b3IoJyNwbGF5ZXJDYW52YXMnKTtcclxuICAgICAgICB0aGlzLmFkZEV2ZW50cygpO1xyXG4gICAgfVxyXG5cclxuICAgIFBIUGxheWVySW5pdC5wcm90b3R5cGUuYWRkRXZlbnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJQbGF5LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5vblBsYXkuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJQYXVzZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMub25QYXVzZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnBsYXllckxpc3QuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLm9uUGxheUxpc3RDbGljay5iaW5kKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnBsYXllclJhbmdlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMub25QbGF5ZXJSYW5nZU1vdXNlRG93bi5iaW5kKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnBsYXllclJhbmdlLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIHRoaXMub25QbGF5ZXJSYW5nZUNoYW5nZS5iaW5kKHRoaXMpKTtcclxuICAgICAgICB0aGlzLnBsYXllckxpc3QuYWRkRXZlbnRMaXN0ZW5lcihcImRyb3BcIiwgdGhpcy5vbkRyb3AuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJMaXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCB0aGlzLm9uRHJhZ092ZXIuYmluZCh0aGlzKSk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJMaXN0LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnbGVhdmVcIiwgdGhpcy5vbkRyYWdMZWF2ZS5iaW5kKHRoaXMpKTtcclxuICAgIH07XHJcblxyXG4gICAgUEhQbGF5ZXJJbml0LnByb3RvdHlwZS5vblBsYXkgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIGlmKHRoaXMuaXNQbGF5KCkpeyByZXR1cm4gdHJ1ZTsgfVxyXG4gICAgICAgIHRoaXMucGxheSgpO1xyXG4gICAgfTtcclxuICAgIFBIUGxheWVySW5pdC5wcm90b3R5cGUub25QbGF5ZXJSYW5nZU1vdXNlRG93biA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgdGhpcy5wYXVzZSgpO1xyXG4gICAgfTtcclxuICAgIFBIUGxheWVySW5pdC5wcm90b3R5cGUub25QbGF5ZXJSYW5nZUNoYW5nZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgdGhpcy5wcm9ncmVzc1NvbmdUaW1lID0gK3RoaXMucGxheWVyUmFuZ2UudmFsdWU7XHJcbiAgICAgICAgdGhpcy5wbGF5KCk7XHJcbiAgICB9O1xyXG4gICAgUEhQbGF5ZXJJbml0LnByb3RvdHlwZS5vblBhdXNlID0gZnVuY3Rpb24oKXtcclxuICAgICAgICB0aGlzLnBhdXNlKCk7XHJcbiAgICB9O1xyXG4gICAgUEhQbGF5ZXJJbml0LnByb3RvdHlwZS5kZWxlZ2F0aW9uRXZlbnQgPSBmdW5jdGlvbihlbGVtLCBzZWxlY3Rvcil7XHJcbiAgICAgICAgdmFyIG1hdGNoZXNTZWxlY3RvciA9IGVsZW0ubWF0Y2hlcyB8fCBlbGVtLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fCBlbGVtLm1vek1hdGNoZXNTZWxlY3RvciB8fCBlbGVtLm1zTWF0Y2hlc1NlbGVjdG9yO1xyXG4gICAgICAgIHdoaWxlIChlbGVtKSB7XHJcbiAgICAgICAgICAgIGlmIChtYXRjaGVzU2VsZWN0b3IuYmluZChlbGVtKShzZWxlY3RvcikpIHJldHVybiBlbGVtO1xyXG4gICAgICAgICAgICBlbGVtID0gZWxlbS5wYXJlbnRFbGVtZW50O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9O1xyXG5cclxuICAgIFBIUGxheWVySW5pdC5wcm90b3R5cGUub25QbGF5TGlzdENsaWNrID0gZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgdmFyIGl0ZW1Tb25nID0gKCBlLnRhcmdldCB8fCBlICApLmNsb3Nlc3QoJy5pdGVtU29uZycpIHx8IHRoaXMuZGVsZWdhdGlvbkV2ZW50KCBlLnRhcmdldCB8fCBlICwgJy5pdGVtU29uZycpO1xyXG4gICAgICAgIGlmKCFpdGVtU29uZykgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICBpZighIXRoaXMudGhpc0VsZW1saXN0KSB0aGlzLnRoaXNFbGVtbGlzdC5yZW1vdmVBdHRyaWJ1dGUoJ2lkJyk7XHJcbiAgICAgICAgdGhpcy50aGlzRWxlbWxpc3QgPSBpdGVtU29uZztcclxuICAgICAgICB0aGlzLnRoaXNFbGVtbGlzdC5pZCA9ICdwbGF5JztcclxuXHJcbiAgICAgICAgdGhpcy5pZFNvbmcgPSB0aGlzLnRoaXNFbGVtbGlzdC5kYXRhc2V0LmlkO1xyXG4gICAgICAgIHRoaXMuc29uZ1VzZSA9IHRoaXMudGVtcExpc3RTb25nW3RoaXMuaWRTb25nXTtcclxuICAgICAgICBpZih0aGlzLnNvbmdVc2UuYnVmZmVyID09ICh0aGlzLnNvdXJjZSAmJiB0aGlzLnNvdXJjZS5idWZmZXIpKXsgcmV0dXJuIHRydWU7IH1cclxuICAgICAgICB0aGlzLnByb2dyZXNzU29uZ1RpbWUgPSAwO1xyXG4gICAgICAgIHRoaXMucGxheSgpO1xyXG5cclxuICAgICAgICB2YXIgY3JlYXRlRnVsbE5hbWVTb25nID0gdGhpcy5zb25nVXNlLnNvbmdGaWxlLm5hbWUuc3BsaXQoJy4nKTtcclxuICAgICAgICBjcmVhdGVGdWxsTmFtZVNvbmcuc3BsaWNlKC0xLCAxKTtcclxuICAgICAgICB0aGlzLnBsYXllckNvbnRyb2wucXVlcnlTZWxlY3RvcignLmZ1bGxOYW1lU29uZycpLmlubmVyVGV4dCA9ICBjcmVhdGVGdWxsTmFtZVNvbmcuam9pbignJyk7XHJcblxyXG4gICAgICAgIHRoaXMucGxheWVyTWV0YURhdGEuaW5uZXJIVE1MID0gdGhpcy5tZXRhRGF0YUZyYW1lID0gJyc7XHJcbiAgICAgICAgZm9yKHZhciBtZXRob2QgaW4gdGhpcy5zb25nVXNlLm1ldGFEYXRhKXtcclxuICAgICAgICAgICAgaWYoIXRoaXMuc29uZ1VzZS5tZXRhRGF0YS5oYXNPd25Qcm9wZXJ0eShtZXRob2QpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYoKCFpc05hTihwYXJzZUZsb2F0KHRoaXMuc29uZ1VzZS5tZXRhRGF0YVttZXRob2RdKSkgJiYgaXNGaW5pdGUodGhpcy5zb25nVXNlLm1ldGFEYXRhW21ldGhvZF0pKSB8fCBpc05hTih0aGlzLnNvbmdVc2UubWV0YURhdGFbbWV0aG9kXSkpXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1ldGFEYXRhRnJhbWUgKz0gJzxkaXYgY2xhc3M9XCInICsgbWV0aG9kICsgJ1wiPicgKyBtZXRob2QgKyAnOiAnICsgdGhpcy5zb25nVXNlLm1ldGFEYXRhW21ldGhvZF0gKyAnPC9kaXY+JztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJNZXRhRGF0YS5pbm5lckhUTUwgPSB0aGlzLm1ldGFEYXRhRnJhbWU7XHJcbiAgICB9O1xyXG5cclxuICAgIFBIUGxheWVySW5pdC5wcm90b3R5cGUub25Ecm9wID0gIGZ1bmN0aW9uKGV2ZW50KXtcclxuICAgICAgICB2YXIgc29uZ3MgPSBldmVudC5kYXRhVHJhbnNmZXIuZmlsZXM7XHJcbiAgICAgICAgaWYoIXNvbmdzKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJMaXN0LmNsYXNzTmFtZSA9ICdvbkRyb3AnO1xyXG4gICAgICAgIC8qVE9ETzogcmVmYWN0b3JpbmcgY29kZSovXHJcbiAgICAgICAgdGhpcy5yZW5kZXJQcm9ncmVzc0Jhcihzb25ncyk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXJMaXN0KHNvbmdzLCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICB0aGlzLiQuZ2V0KCd0ZW1wbGF0ZXMvbGlzdFNvbmcuaHRtbCcsIGZ1bmN0aW9uKHRlbXBsYXRlX3RleHQpe1xyXG4gICAgICAgICAgICAgICAgd2luZG93LmNvbnNvbGUubG9nKHRoaXMudGVtcExpc3RTb25nKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJChcIiNwbGF5ZXJMaXN0XCIpLmh0bWwoIHRoaXMuXy50ZW1wbGF0ZSh0ZW1wbGF0ZV90ZXh0KSh7aXRlbXM6IHRoaXMudGVtcExpc3RTb25nfSkpO1xyXG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgICAgIH0uYmluZCh0aGlzKSk7XHJcbiAgICAgICAgLyoqL1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9O1xyXG5cclxuICAgIFBIUGxheWVySW5pdC5wcm90b3R5cGUub25EcmFnTGVhdmUgPSBmdW5jdGlvbihldmVudCl7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJMaXN0ID0gdGhpcy5wbGF5ZXJMaXN0LmNsb3Nlc3QoJyNwbGF5ZXJMaXN0JykgfHwgdGhpcy5kZWxlZ2F0aW9uRXZlbnQodGhpcy5wbGF5ZXJMaXN0LCAnI3BsYXllckxpc3QnKTtcclxuICAgICAgICB0aGlzLnBsYXllckxpc3QuY2xhc3NOYW1lID0gJ29uRHJhZ0xlYXZlJztcclxuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBQSFBsYXllckluaXQucHJvdG90eXBlLm9uRHJhZ092ZXIgPSBmdW5jdGlvbihldmVudCl7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJMaXN0ID0gdGhpcy5wbGF5ZXJMaXN0LmNsb3Nlc3QoJyNwbGF5ZXJMaXN0JykgfHwgdGhpcy5kZWxlZ2F0aW9uRXZlbnQodGhpcy5wbGF5ZXJMaXN0LCAnI3BsYXllckxpc3QnKTtcclxuICAgICAgICB0aGlzLnBsYXllckxpc3QuY2xhc3NOYW1lID0gJ29uRHJhZ092ZXInO1xyXG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICB9O1xyXG5cclxuICAgIFBIUGxheWVySW5pdC5wcm90b3R5cGUubG9hZE1lZGlhID0gZnVuY3Rpb24oc29uZyl7XHJcbiAgICAgICAgLypUT0RPOiByZWZhY3RvcmluZyBjb2RlKi9cclxuICAgICAgICB2YXIgZGZkID0gdGhpcy4kLkRlZmVycmVkKCk7XHJcblxyXG4gICAgICAgIGlmKHR5cGVvZiBzb25nICE9PSBcInN0cmluZ1wiKXtcclxuICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyB3aW5kb3cuRmlsZVJlYWRlcigpO1xyXG4gICAgICAgICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoc29uZyk7XHJcbiAgICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoZSl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFyZ3MgPSB0aGlzLiQubWFrZUFycmF5KGFyZ3VtZW50cyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlY29kZShlLnRhcmdldC5yZXN1bHQsIHNvbmcsIGRmZCk7XHJcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgdmFyIHhociA9IG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcclxuICAgICAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHNvbmcsIHRydWUpO1xyXG4gICAgICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcclxuICAgICAgICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kZWNvZGUoeGhyLnJlc3BvbnNlLCBkZmQpO1xyXG4gICAgICAgICAgICB9LmJpbmQodGhpcyk7XHJcbiAgICAgICAgICAgIHhoci5zZW5kKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZGZkLnByb21pc2UoKTtcclxuICAgIH07XHJcblxyXG4gICAgUEhQbGF5ZXJJbml0LnByb3RvdHlwZS5kZWNvZGUgPSBmdW5jdGlvbihhcnJheUJ1ZmZlciwgc29uZywgZGZkKXtcclxuICAgICAgICB2YXIgZHYgPSBuZXcgd2luZG93LmpEYXRhVmlldyhhcnJheUJ1ZmZlcik7XHJcbiAgICAgICAgdmFyIHNvbmdGaWxlID0gc29uZztcclxuICAgICAgICB2YXIgbWV0YURhdGEgPSB7fTtcclxuICAgICAgICBpZiAoZHYuZ2V0U3RyaW5nKDMsIGR2LmJ5dGVMZW5ndGggLSAxMjgpID09ICdUQUcnKSB7XHJcbiAgICAgICAgICAgIG1ldGFEYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgbmFtZVNvbmc6IGR2LmdldFN0cmluZygzMCwgZHYudGVsbCgpKSxcclxuICAgICAgICAgICAgICAgIGFydGlzdDogZHYuZ2V0U3RyaW5nKDMwLCBkdi50ZWxsKCkpLFxyXG4gICAgICAgICAgICAgICAgYWxidW06IGR2LmdldFN0cmluZygzMCwgZHYudGVsbCgpKSxcclxuICAgICAgICAgICAgICAgIHllYXI6IGR2LmdldFN0cmluZyg0LCBkdi50ZWxsKCkpXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGFycmF5QnVmZmVyLCBmdW5jdGlvbiggYXVkaW9CdWZmZXIgKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gYXVkaW9CdWZmZXI7XHJcbiAgICAgICAgICAgIHRoaXMuYXJncy5wdXNoKGRmZC5yZXNvbHZlKTtcclxuICAgICAgICAgICAgdGhpcy50ZW1wTGlzdFNvbmcucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBtZXRhRGF0YTogbWV0YURhdGEsXHJcbiAgICAgICAgICAgICAgICBidWZmZXI6IHRoaXMuYnVmZmVyLFxyXG4gICAgICAgICAgICAgICAgc29uZ0ZpbGU6IHNvbmdGaWxlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBkZmQucmVzb2x2ZShhdWRpb0J1ZmZlcik7XHJcbiAgICAgICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIC8qVE9ETzogcmVmYWN0b3JpbmcgY29kZSovXHJcbiAgICBQSFBsYXllckluaXQucHJvdG90eXBlLnJlbmRlclByb2dyZXNzQmFyID0gZnVuY3Rpb24oc29uZ3Mpe1xyXG4gICAgICAgIHRoaXMucHJvZ3Jlc3NCYXJMZW5ndGggPSAxMDAvc29uZ3MubGVuZ3RoO1xyXG4gICAgICAgIHRoaXMucGxheWVyTGlzdC5pbm5lckhUTUwgPSBcIjxkaXYgaWQ9J3Byb2dyZXNzQmFyJyBzdHlsZT0nd2lkdGg6IDAnPjxzcGFuPkxvYWRpbmcuLi48L3NwYW4+PC9kaXY+XCI7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJMaXN0LmNoaWxkcmVuWzBdLnN0eWxlLndpZHRoID0gdGhpcy5wcm9ncmVzc0Jhckxlbmd0aCAqIDErJyUnO1xyXG4gICAgfTtcclxuICAgIC8qKi9cclxuICAgIFBIUGxheWVySW5pdC5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgdGhpcy5jb25uZWN0KCk7XHJcbiAgICAgICAgdGhpcy5zdGFydCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBQSFBsYXllckluaXQucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIHRoaXMucGF1c2UoKTtcclxuICAgICAgICB0aGlzLmluaXRQbGF5ZXJSYW5nZSgpO1xyXG4gICAgICAgIHRoaXMuY2hlY2tUaW1lQ291bnRlcigpO1xyXG5cclxuICAgICAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcclxuICAgICAgICB0aGlzLmFuYWx5c2VyID0gdGhpcy5jb250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XHJcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbiA9IHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbjtcclxuICAgICAgICB0aGlzLmN1cnJlbnRUaW1lID0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lLnRvRml4ZWQoMCk7XHJcbiAgICAgICAgdGhpcy5zb3VyY2UuYnVmZmVyID0gdGhpcy5zb25nVXNlLmJ1ZmZlcjtcclxuICAgICAgICB0aGlzLmFuYWx5c2VyLmNvbm5lY3QodGhpcy5kZXN0aW5hdGlvbik7XHJcbiAgICAgICAgdGhpcy5zb3VyY2UuY29ubmVjdCh0aGlzLmFuYWx5c2VyKTtcclxuICAgICAgICB0aGlzLnNvdXJjZS5jb25uZWN0KHRoaXMuZGVzdGluYXRpb24pO1xyXG5cclxuICAgICAgICB3aW5kb3cudmlzdWFsaXphdGlvblNvbmcodGhpcy5hbmFseXNlciwgdGhpcy5wbGF5ZXJDYW52YXMpO1xyXG4gICAgfTtcclxuXHJcbiAgICBQSFBsYXllckluaXQucHJvdG90eXBlLmluaXRQbGF5ZXJSYW5nZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgdGhpcy5taW5SYW5nZSA9ICcwJztcclxuICAgICAgICB0aGlzLm1heFJhbmdlID0gdGhpcy5zb25nVXNlLmJ1ZmZlci5kdXJhdGlvbjtcclxuICAgICAgICB0aGlzLnBsYXllclJhbmdlLnNldEF0dHJpYnV0ZSgnbWluJywgdGhpcy5taW5SYW5nZSk7XHJcbiAgICAgICAgdGhpcy5wbGF5ZXJSYW5nZS5zZXRBdHRyaWJ1dGUoJ21heCcsIHRoaXMubWF4UmFuZ2UpO1xyXG4gICAgfTtcclxuXHJcbiAgICBQSFBsYXllckluaXQucHJvdG90eXBlLmNoZWNrVGltZUNvdW50ZXIgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIHZhciB0aW1lID0gdGhpcy5wcm9ncmVzc1NvbmdUaW1lO1xyXG4gICAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMuY291bnRlcik7XHJcbiAgICAgICAgdGhpcy5jeWNsZVNvbmcoKTtcclxuICAgICAgICB0aGlzLnBsYXllclRpbWVyLmlubmVySFRNTCA9IHdpbmRvdy5mb3JtYXRUaW1lKHRoaXMucHJvZ3Jlc3NTb25nVGltZSk7XHJcbiAgICAgICAgdGhpcy5jb3VudGVyID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgIHZhciBjb3VudGVyID0gICt0aGlzLmNvbnRleHQuY3VycmVudFRpbWUudG9GaXhlZCgwKSAtIHRoaXMuY3VycmVudFRpbWUgKyB0aW1lO1xyXG4gICAgICAgICAgICB0aGlzLnByb2dyZXNzU29uZ1RpbWUgPSAoIGNvdW50ZXIgPj0gdGhpcy5zb25nVXNlLmJ1ZmZlci5kdXJhdGlvbiApID8gdGhpcy5wcm9ncmVzc1NvbmdUaW1lIDogY291bnRlcjtcclxuICAgICAgICAgICAgdGhpcy5wbGF5ZXJUaW1lci5pbm5lckhUTUwgPSB3aW5kb3cuZm9ybWF0VGltZSh0aGlzLnByb2dyZXNzU29uZ1RpbWUpO1xyXG4gICAgICAgICAgICB0aGlzLnBsYXllclJhbmdlLnZhbHVlID0gdGhpcy5wcm9ncmVzc1NvbmdUaW1lO1xyXG4gICAgICAgIH0uYmluZCh0aGlzKSwgMTAwKTtcclxuICAgIH07XHJcblxyXG4gICAgUEhQbGF5ZXJJbml0LnByb3RvdHlwZS5jeWNsZVNvbmcgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIC8qVE9ETzogZGVsZXRlZCovXHJcbiAgICAgICAgdGhpcy5pc0N5Y2xlU29uZyA9IHRydWU7XHJcbiAgICAgICAgLyotLSovXHJcbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLm5leHRTb25nKTtcclxuICAgICAgICB0aGlzLm5leHRTb25nID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKXsgLy8gVE9ETzogZmluZCBhIHdheSB0byBzd2l0Y2ggdG8gdGhlIGluYWN0aXZlIHRhYiB3aXRob3V0IFwic2V0VGltZW91dFwiXHJcbiAgICAgICAgICAgIGlmKCF0aGlzLmlzQ3ljbGVTb25nKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmKHRoaXMudGVtcExpc3RTb25nLmxlbmd0aC0xPD10aGlzLmlkU29uZykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vblBsYXlMaXN0Q2xpY2sodGhpcy50aGlzRWxlbWxpc3QucGFyZW50RWxlbWVudC5jaGlsZHJlblswXSkgO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5vblBsYXlMaXN0Q2xpY2sodGhpcy50aGlzRWxlbWxpc3QubmV4dEVsZW1lbnRTaWJsaW5nKTtcclxuICAgICAgICB9LmJpbmQodGhpcyksICh0aGlzLnNvbmdVc2UuYnVmZmVyLmR1cmF0aW9uIC0gdGhpcy5wcm9ncmVzc1NvbmdUaW1lKSoxMDAwKTtcclxuICAgIH07XHJcblxyXG4gICAgUEhQbGF5ZXJJbml0LnByb3RvdHlwZS5pc1BhdXNlID0gZnVuY3Rpb24oKXtcclxuICAgICAgICByZXR1cm4gKHRoaXMuc291cmNlICYmIHRoaXMuc291cmNlLnN0b3ApO1xyXG4gICAgfTtcclxuXHJcbiAgICBQSFBsYXllckluaXQucHJvdG90eXBlLmlzUGxheSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuICEhdGhpcy5zb3VyY2U7XHJcbiAgICB9O1xyXG5cclxuICAgIFBIUGxheWVySW5pdC5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIGlmKCF0aGlzLmlzUGF1c2UoKSkgcmV0dXJuO1xyXG4gICAgICAgIHRoaXMuc291cmNlLnN0YXJ0KHRoaXMuY29udGV4dC5jdXJyZW50VGltZSwgdGhpcy5wcm9ncmVzc1NvbmdUaW1lKTtcclxuICAgIH07XHJcblxyXG4gICAgUEhQbGF5ZXJJbml0LnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgaWYoIXRoaXMuaXNQbGF5KCkpIHJldHVybjtcclxuICAgICAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbCh0aGlzLmNvdW50ZXIpO1xyXG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5uZXh0U29uZyk7XHJcbiAgICAgICAgdGhpcy5zb3VyY2Uuc3RvcCgwKTtcclxuICAgICAgICB0aGlzLnNvdXJjZSA9IG51bGw7XHJcbiAgICB9O1xyXG5cclxuICAgIFBIUGxheWVySW5pdC5wcm90b3R5cGUucmVuZGVyTGlzdCA9IGZ1bmN0aW9uIChzb25ncywgY2FsbGJhY2spIHtcclxuICAgICAgICAvKlRPRE86IHJlZmFjdG9yaW5nIGNvZGUqL1xyXG4gICAgICAgIHZhciAkID0gdGhpcy4kO1xyXG4gICAgICAgICQud2hlbi5hcHBseSgkLCAkLm1hcCgkLm1ha2VBcnJheShzb25ncyksIGZ1bmN0aW9uKHNvbmcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubG9hZE1lZGlhKHNvbmcpLnRoZW4oZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5jb25zb2xlLmxvZyh0aGlzLnRlbXBMaXN0U29uZyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBsYXllckxpc3QuY2hpbGRyZW5bMF0uc3R5bGUud2lkdGggPSB0aGlzLnByb2dyZXNzQmFyTGVuZ3RoICogKHRoaXMudGVtcExpc3RTb25nLmxlbmd0aCArIDEpICsgJyUnO1xyXG4gICAgICAgICAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgICAgIH0uYmluZCh0aGlzKSkpLnRoZW4oY2FsbGJhY2spO1xyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gUEhQbGF5ZXJJbml0O1xyXG59KTtcclxuXHJcbndpbmRvdy5kb2N1bWVudC5yZWFkeSA9IHdpbmRvdy5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBmdW5jdGlvbigpIHtcclxuICAgIG5ldyB3aW5kb3cuUEhQbGF5ZXJJbml0KHdpbmRvdy5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcEhQbGF5ZXInKSk7XHJcbn0pOyJdfQ==
