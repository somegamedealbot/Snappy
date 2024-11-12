import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import dashjs from 'dashjs';
import ControlBar from '../scripts/ControlBar';

export default function Video({ videoURL, index, currentVideoIndex, button}) {
    const [mpdData, setMpdData] = useState(null);
    const [likeCount, setLikeCount] = useState(0);
    const [userReaction, setUserReaction] = useState(null);  // Track user reaction: true, false, or null
    const [isPlaying, setIsPlaying] = useState(false);

    const videoElementRef = useRef(null);
    const playerRef = useRef(null);

    // Fetch the MPD content directly from the backend
    const fetchVideo = async () => {
        try {
            // console.log(videoURL);
            const response = await axios.get(videoURL);
            setMpdData(response.data);
        } catch (error) {
            console.error("Error fetching video:", error);
        }
    };
    
    useEffect(() => {
        console.log(`Current video index: ${currentVideoIndex}, This video index: ${index}`);
        if (videoElementRef.current) {
            if (index !== currentVideoIndex) {
                console.log(`Pausing video ${index}`);
                videoElementRef.current.pause();
                setIsPlaying(false);
            }
        }
    }, [currentVideoIndex]);

    // Initialize Dash.js player using raw MPD data
    const initializePlayer = () => {
        // console.log(videoURL);
        if (videoElementRef.current && mpdData) {
            if (playerRef.current) {
                playerRef.current.reset();
            }
            playerRef.current = dashjs.MediaPlayer().create();
            playerRef.current.updateSettings({
                streaming: {
                    buffer: {
                      bufferToKeep: 60,  // Keep 30 seconds of video in the buffer before playback starts
                      initialBufferLevel: 60,
                      fastSwitchEnabled: false
                      //   bufferTime: 3,
                    //   bufferTimeAtTopQualityLongForm: 3,  // Keep 15 seconds of high-quality video in the buffer
                    //   initialBufferTime: 10  // Preload 10 seconds of content before playback starts
                    },
                    abr: {
                        movingAverageMethod: 'ewma',
                        ABRStrategy: 'abrThroughput',
                        autoSwitchBitrate: {
                            video: false
                        }
                    }
                },
            //     autoPlay: false, // Explicitly disable auto-play
            });
            playerRef.current.initialize(videoElementRef.current, videoURL, false);
            playerRef.current.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, () => {
                console.log(`Manifest for ${index} has loaded`);
                // axios.post('/api/log', {
                //     manifest: `Manifest for ${index} has loaded!`
                // });
            })
            playerRef.current.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, function () {
                // Retrieve available video quality levels
                const bitrates = playerRef.current.getBitrateInfoListFor("video");    
                // Check if we have at least one quality level
                if (bitrates.length > 0) {
                  // Set the quality to the lowest level (index 0)
                  playerRef.current.setQualityFor("video", 0);
                }
            });
            playerRef.current.on(dashjs.MediaPlayer.events.ERROR, (e) => {
                console.log(`Error on player ${index}`, e);
                // axios.post('/api/log', {
                //     error: `Manifest for ${index} has an error!
                //     ${e}
                //     `
                // });
            })
            let controlbar = new ControlBar(playerRef.current);
            // console.log('index', index);
            controlbar.initialize(String(index)); // use index as suffix
        }
    };

    // Fetch video on component mount
    useEffect(() => {
        fetchVideo();
    }, [videoURL]);

    // Initialize Dash.js player when MPD data is fetched
    useEffect(() => {
        if (mpdData) {
            initializePlayer();
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [mpdData]);

    // if (button && playerRef.current !== null) {
    //     console.log(`Current State for player ${index}:` + playerRef.current.getReadyState());
    // }

    // Toggle play/pause
    const togglePlayPause = () => {
        if (videoElementRef.current) {
            if (videoElementRef.current.paused) {
                videoElementRef.current.play();
                // axios.post('/api/log', {
                //     play: `Playing video ${index}.`
                // });
                setIsPlaying(true);
            } else {
                videoElementRef.current.pause();
                // axios.post('/api/log', {
                //     pause: `Pausing video ${index}.`
                // });
                setIsPlaying(false);
            }
        }
    };

    
    const updateReaction = async (value) => {
        try {
            //pass the correct id
            const url = videoURL;
            const id = url.split('/').pop()
  
            const response = await axios.post('/api/like', { id, value });
            // console.log(response.data)
            if (response.data.error){
                console.log("error")
            }else{
                setLikeCount(response.data.likes);  // Update like count from the response
                setUserReaction(value);  // Update user reaction
            }
            
        } catch (error) {
            console.error('Error updating reaction:', error);
        }
    };

    const handleLike = () => {
            updateReaction(true);
    };

    const handleDislike = () => {
            updateReaction(false);
    };
    return (
        <div id="video-container" style={{height:"90vh"}}>
            <div id="video-container-elements"> 
                <video ref={videoElementRef} id="videoPlayer" width={640} height={360}></video>
                <div id={`videoController${index}`} className="video-controller unselectable">
                    {button && (<div
                        id={`playPauseBtn`}
                        className="btn-play-pause"
                        title="Play/Pause"
                        onClick={togglePlayPause}
                    >
                        <span id={`iconPlayPause${index}`} className={isPlaying ? "icon-pause" : "icon-play"}></span>
                    </div>
                    )} 
                    
                    <span id={`videoTime${index}`} className="time-display">00:00:00</span>

                    <button
                        id={`likeBtn${index}`}
                        name="like"
                        className="btn-like control-icon-layout"
                        title="Like"
                        onClick={handleLike}
                    >
                        <span className="icon-like"></span> {likeCount} Like
                    </button>

                    <button
                        id={`thumbsDownBtn${index}`}
                        name="dislike"
                        className="btn-thumbs-down control-icon-layout"
                        title="Dislike"
                        onClick={handleDislike}
                    >
                        <span className="icon-thumbs-down"></span> Dislike
                    </button>

                    <div id={`viewCount${index}`} className="view-count control-icon-layout" title="Views">
                        <span className="icon-view"></span>
                        <span className="view-count-text">0</span> {/* Default view count */}
                    </div>

                    <div id={`fullscreenBtn${index}`} className="btn-fullscreen control-icon-layout" title="Fullscreen">
                        <span className="icon-fullscreen-enter"></span>
                    </div>

                    <div id={`bitrateListBtn${index}`} className="control-icon-layout" title="Bitrate List">
                        <span className="icon-bitrate"></span>
                    </div>

                    <input
                        type="range"
                        id={`volumebar${index}`}
                        className="volumebar"
                        defaultValue="1"
                        min="0"
                        max="1"
                        step="0.01"
                    />

                    <div id={`muteBtn${index}`} className="btn-mute control-icon-layout" title="Mute">
                        <span id={`iconMute${index}`} className="icon-mute-off"></span>
                    </div>

                    <div id={`trackSwitchBtn${index}`} className="control-icon-layout" title="A/V Tracks">
                        <span className="icon-tracks"></span>
                    </div>

                    <div id={`captionBtn${index}`} className="btn-caption control-icon-layout" title="Closed Caption">
                        <span className="icon-caption"></span>
                    </div>

                    <span id={`videoDuration${index}`} className="duration-display">00:00:00</span>

                    <div className="seekContainer">
                        <input
                            type="range"
                            id={`seekbar${index}`}
                            defaultValue="0"
                            className="seekbar"
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}