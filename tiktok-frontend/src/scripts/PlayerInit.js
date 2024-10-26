// Initialize dash.js player
var url = 'http://wbill.cse356.compas.cs.stonybrook.edu/media/output.mpd'; // Update with your actual server URL
var player = dashjs.MediaPlayer().create();
player.initialize(document.querySelector("#videoPlayer"), url, true);
var controlbar = new ControlBar(player);
controlbar.initialize();