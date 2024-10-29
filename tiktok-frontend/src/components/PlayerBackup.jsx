import { useEffect } from 'react';
import dashjs from 'dashjs';
import '../css/controlbar.css';
import ControlBar from '../scripts/ControlBar';
import { useLoaderData } from 'react-router-dom';
import axios from 'axios';

function Player(){

    const mpdUrl = useLoaderData();
    const player = dashjs.MediaPlayer().create();
    
    useEffect(() => {
        const videoPlayerElement = document.querySelector("#videoPlayer");
        player.initialize(videoPlayerElement, mpdUrl, true);
        let controlbar = new ControlBar(player);
        controlbar.initialize();
    }, [mpdUrl, player]);

    return (
        <>
          {/* <script src="./scripts/ControlBar.js"></script>
          <script src="https://cdn.dashjs.org/latest/dash.all.min.js"></script> */}
        <div id="video-container">
            <div id="video-container-elements"> 
                <video id="videoPlayer" width={640} height={360} ></video>
                <div id="videoController" className="video-controller unselectable">
                <div id="playPauseBtn" className="btn-play-pause" title="Play/Pause"
                    onClick={(e) => {
                        player.isPaused() ? player.play() : player.pause();
                    }}>
                    <span id="iconPlayPause" className="icon-play"></span>
                </div>
                <span id="videoTime" className="time-display">00:00:00</span>
                <div id="fullscreenBtn" className="btn-fullscreen control-icon-layout" title="Fullscreen">
                    <span className="icon-fullscreen-enter"></span>
                </div>
                <div id="bitrateListBtn" className="control-icon-layout" title="Bitrate List">
                    <span className="icon-bitrate"></span>
                </div>
                <input type="range" id="volumebar" className="volumebar" defaultValue="1" min="0" max="1" step=".01"/>
                <div id="muteBtn" className="btn-mute control-icon-layout" title="Mute">
                    <span id="iconMute" className="icon-mute-off"></span>
                </div>
                <div id="trackSwitchBtn" className="control-icon-layout" title="A/V Tracks">
                    <span className="icon-tracks"></span>
                </div>
                <div id="captionBtn" className="btn-caption control-icon-layout" title="Closed Caption">
                    <span className="icon-caption"></span>
                </div>
                <span id="videoDuration" className="duration-display">00:00:00</span>
                <div className="seekContainer">
                    <input type="range" id="seekbar" defaultValue="0" className="seekbar" min="0" step="0.01"/>
                </div>
                </div>
            </div>
        
        </div>
        {/* <script src="./scripts/PlayerInit.js"></script> */}
        </>
    )
}

export default Player;





