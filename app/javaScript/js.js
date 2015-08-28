/**
 * @author Anton.Filin
 */

(function (global, factory) {
    /* TODO: Add AMD */
    global.PHPlayerInit = factory();
})
(window, function(){

    function PHPlayerInit (element){
        "use strict";
        this.context = new (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext)();
        if(!this.context) return;
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
        this.play()
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
        this.playerMetaData.innerHTML = this.metaDataFrame
    };

    PHPlayerInit.prototype.onDrop =  function(event){
        var songs = event.dataTransfer.files;
        if(!songs) return false;
        this.playerList.className = 'onDrop';
        /*TODO: refactoring code*/
        this.renderProgressBar(songs);
        this.renderList(songs, function(){
            $.get('templates/listSong.html', function(template_text){
                console.log(this.tempListSong);
                $("#playerList").html( _.template(template_text)({items: this.tempListSong}));
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
        var dfd = $.Deferred();

        if(typeof song !== "string"){
            var reader = new FileReader();
            reader.readAsArrayBuffer(song);
            reader.onload = function (e){
                this.args = $.makeArray(arguments);
                this.decode(e.target.result, song, dfd);
            }.bind(this);
        }else{
            var xhr = new XMLHttpRequest();
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
        var dv = jDataView(arrayBuffer);
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

        visualizationSong(this.analyser, this.playerCanvas);
    };

    PHPlayerInit.prototype.initPlayerRange = function(){
        this.minRange = '0';
        this.maxRange = this.songUse.buffer.duration;
        this.playerRange.setAttribute('min', this.minRange);
        this.playerRange.setAttribute('max', this.maxRange);
    };

    PHPlayerInit.prototype.checkTimeCounter = function(){
        var time = this.progressSongTime;
        clearInterval(this.counter);
        this.cycleSong();
        this.playerTimer.innerHTML = formatTime(this.progressSongTime);
        this.counter = setInterval(function(){
            var counter =  +this.context.currentTime.toFixed(0) - this.currentTime + time;
            this.progressSongTime = ( counter >= this.songUse.buffer.duration ) ? this.progressSongTime : counter;
            this.playerTimer.innerHTML = formatTime(this.progressSongTime);
            this.playerRange.value = this.progressSongTime;
        }.bind(this), 100);
    };

    PHPlayerInit.prototype.cycleSong = function(){
        /*TODO: deleted*/
        this.isCycleSong = true;
        /*--*/
        clearTimeout(this.nextSong);
        this.nextSong = setTimeout(function(){ // TODO: find a way to switch to the inactive tab without "setTimeout"
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
        clearInterval(this.counter);
        clearTimeout(this.nextSong);
        this.source.stop(0);
        this.source = null;
    };

    PHPlayerInit.prototype.renderList = function (songs, callback) {
        /*TODO: refactoring code*/
        $.when.apply($, $.map($.makeArray(songs), function(song) {
            return this.loadMedia(song).then(function(){
                console.log(this.tempListSong);
                this.playerList.children[0].style.width = this.progressBarLength * (this.tempListSong.length + 1) + '%';
            }.bind(this));
        }.bind(this))).then(callback);
    };

    return PHPlayerInit
});

document.ready = document.addEventListener("DOMContentLoaded", function() {
    new PHPlayerInit(document.querySelector('#pHPlayer'));
});