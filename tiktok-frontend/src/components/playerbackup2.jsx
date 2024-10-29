import { useEffect, useState } from 'react';
import dashjs from 'dashjs';
import '../css/controlbar.css';
import ControlBar from '../scripts/ControlBar';
import { useLoaderData } from 'react-router-dom';
import axios from 'axios';

function Player() {
    const initialMpdUrl = useLoaderData();  // Initial array of video URLs from the loader
    const [mpdUrl, setMpdUrl] = useState(initialMpdUrl);  // State to hold the array of video URLs
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);  // Track current video index
    const [isFetching, setIsFetching] = useState(false);  // State to track if fetch is in progress
    const player = dashjs.MediaPlayer().create();

    // Function to load a video by index
    const loadVideo = (index) => {
        console.log("Loading video at index:", index, mpdUrl[index]);
        const videoPlayerElement = document.querySelector("#videoPlayer");
        player.initialize(videoPlayerElement, mpdUrl[index], true);
        let controlbar = new ControlBar(player);
        controlbar.initialize();
    };

    // Debugging: log mpdUrl when it changes
    useEffect(() => {
        console.log("Updated mpdUrl:", mpdUrl);
    }, [mpdUrl]);

    useEffect(() => {
        if (mpdUrl[currentVideoIndex]) {
            loadVideo(currentVideoIndex);
        }

        return () => {
            player.reset();
        };
    }, [currentVideoIndex, mpdUrl]);

    // Function to fetch a new video and append to mpdUrl
    const fetchNewVideo = async () => {
        try {
            setIsFetching(true);  // Prevent further fetching while fetching is in progress
            const response = await axios.post('http://wbill.cse356.compas.cs.stonybrook.edu/api/videos', { count: 1 });
            if (response.data.length === 0) {
                console.log('No more videos available');
                return;  // Do nothing if no videos are returned
            }
            const newVideo = response.data[0];
            const newVideoUrl = `http://wbill.cse356.compas.cs.stonybrook.edu/api/manifest/${newVideo.id}`;
            setMpdUrl((prevMpdUrl) => [...prevMpdUrl, newVideoUrl]);  // Append the new video URL to the list
            console.log("New video added:", newVideoUrl);
        } catch (error) {
            console.error('Error fetching new video:', error);
        } finally {
            setIsFetching(false);
        }
    };

    let scrollTimeout = null;

    const handleScroll = () => {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        scrollTimeout = setTimeout(() => {
            const scrollTop = window.scrollY === 0;
            const scrollBottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight;

            // Scroll Up: Play the previous video (do not fetch new ones)
            if (scrollTop && currentVideoIndex > 0) {
                setCurrentVideoIndex((prevIndex) => prevIndex - 1);  // Move to the previous video
            }

            // Scroll Down: Fetch new video only if not already fetching
            if (scrollBottom && !isFetching) {
                fetchNewVideo().then(() => {
                    setCurrentVideoIndex((prevIndex) => prevIndex + 1);  // Move to the newly fetched video
                });
            }
        }, 100);  // Debounce scroll event by 100ms
    };

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);

        return () => window.removeEventListener('scroll', handleScroll);
    }, [currentVideoIndex]);

    return (
        <div id="video-container">
            <div id="video-container-elements"> 
                <video id="videoPlayer" width={640} height={360}></video>
                <div id="videoController" className="video-controller unselectable">
                    <div id="playPauseBtn" className="btn-play-pause" title="Play/Pause"
                        onClick={() => {
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
    );
}

export default Player;
