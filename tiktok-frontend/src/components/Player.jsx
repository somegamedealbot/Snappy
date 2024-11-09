import { useEffect, useState, useRef } from 'react';
import dashjs from 'dashjs';
import '../css/controlbar.css';
import ControlBar from '../scripts/ControlBar';
import { useLoaderData, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Player() {
    const initialMpdUrl = useLoaderData();  // Initial array of video URLs from the loader
    const [mpdUrl, setMpdUrl] = useState(initialMpdUrl);  // State to hold the array of video URLs
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);  // Track current video index
    const [isFetching, setIsFetching] = useState(false);  // State to track if fetch is in progress
    const videoElementRef = useRef(null);  // Ref for the video DOM element
    const playerRef = useRef(null);  // Ref to hold the Dash.js player instance
    const navigate = useNavigate();  // For changing the URL

    const [likeCount, setLikeCount] = useState(0);
    const [userReaction, setUserReaction] = useState(null);  // Track user reaction: true, false, or null
    const [viewedVideos, setViewedVideos] = useState(new Set()); // Track videos marked as viewed



    const [isPlaying, setIsPlaying] = useState(false); // State to track if the video is playing



    const updateReaction = async (value) => {
        try {
            //pass the correct id
            const url = mpdUrl[currentVideoIndex]
            const id = url.split('/').pop()
  
            const response = await axios.post('/api/like', { id, value });
            console.log(response.data)
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

    // Function to initialize and load the video by index
    const loadVideo = async (index) => {
        if (!mpdUrl[index]) return;
    
        const videoPlayerElement = videoElementRef.current;
        const videoUrl = mpdUrl[index];
        const videoId = videoUrl.split('/').pop();
    
        if (!videoPlayerElement) {
            console.error("Video element is not available.");
            return;
        }
    
        if (!playerRef.current) {
            console.log("Initializing Dash.js player");
    
            playerRef.current = dashjs.MediaPlayer().create();
            playerRef.current.initialize(videoPlayerElement, null, true);
    
            // Attach event listeners
            playerRef.current.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, () => {
                console.log("Playback started");
                setIsPlaying(true);
                document.getElementById("iconPlayPause").classList.remove("icon-play");
                document.getElementById("iconPlayPause").classList.add("icon-pause");
            });
    
            playerRef.current.on(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, () => {
                console.log("Playback paused");
                setIsPlaying(false);
                document.getElementById("iconPlayPause").classList.remove("icon-pause");
                document.getElementById("iconPlayPause").classList.add("icon-play");
            });
    
            playerRef.current.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
                console.log("Stream initialized");
                initializeControlBar();
            });
        }
    
        console.log("Attaching new video source");
        playerRef.current.attachSource(videoUrl);
    
        navigate(`/play/${videoId}`, { replace: true });
        markVideoAsViewed(videoId);
    };
    
    
    // Function to initialize the control bar
    const initializeControlBar = () => {
        if (playerRef.current) {
            const controlbar = new ControlBar(playerRef.current);
            controlbar.initialize();
            console.log("Control bar initialized");
        }
    };
    
    

    const markVideoAsViewed = async (videoId) => {
        if (viewedVideos.has(videoId)) {
            return; // Skip if video is already marked as viewed
        }

        try {
            const response = await axios.post('/api/view', { id: videoId });
            if (response.data.viewed === false) {
                setViewedVideos((prev) => new Set(prev).add(videoId)); // Add to viewed set if new
                console.log(`Video ${videoId} marked as viewed`);
            }
            
        } catch (error) {
            console.error('Error marking video as viewed:', error);
        }
    };

    // UseEffect to load the video when currentVideoIndex changes
    useEffect(() => {
        if (mpdUrl[currentVideoIndex]) {
            loadVideo(currentVideoIndex);
        }

        // Cleanup function to reset the player when the component unmounts or the video changes
        return () => {
            if (playerRef.current) {
                console.log("Resetting Dash.js player");
                playerRef.current.reset();
                playerRef.current = null;  // Reset the player reference
            }
        };
    }, [currentVideoIndex, mpdUrl]);

    // Function to fetch a new video and append it to mpdUrl
    const fetchNewVideo = async () => {
        try {
            setIsFetching(true);  // Prevent further fetching while fetching is in progress
            const response = await axios.post('http://wbill.cse356.compas.cs.stonybrook.edu/api/videos', { count: 1 });
            if (response.data.videos.length === 0) {
                console.log('No more videos available');
                return;  // Do nothing if no videos are returned
            }
            const newVideo = response.data.videos[0];
            const newVideoUrl = `http://wbill.cse356.compas.cs.stonybrook.edu/api/manifest/${newVideo.id}`;
            setMpdUrl((prevMpdUrl) => [...prevMpdUrl, newVideoUrl]);  // Append the new video URL to the list
            console.log("New video added:", newVideoUrl);
        } catch (error) {
            console.error('Error fetching new video:', error);
        } finally {
            setIsFetching(false);
        }
    };

    // Scroll event handler to play previous or next video
    // const handleScroll = (e) => {
    //     const scrollTop = window.scrollY === 0;
    //     const scrollBottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight;

    //     // Scroll Up: Play the previous video (do not fetch new ones)
    //     if (scrollTop && currentVideoIndex > 0) {
    //         setCurrentVideoIndex((prevIndex) => prevIndex - 1);  // Move to the previous video
    //     }

    //     // Scroll Down: Fetch new video only if not already fetching
    //     if (scrollBottom && !isFetching) {
    //         fetchNewVideo().then(() => {
    //             setCurrentVideoIndex((prevIndex) => prevIndex + 1);  // Move to the newly fetched video
    //         });
    //     }
    // };

    useEffect(() => {
        // Use wheel event instead of scroll for better UX (like YouTube Shorts)
        const handleWheel = (event) => {
            if (event.deltaY > 0) {
                // Scrolling down
                if (!isFetching && currentVideoIndex < mpdUrl.length - 1) {
                    setCurrentVideoIndex((prevIndex) => prevIndex + 1);  // Move to next video
                } else if (!isFetching) {
                    fetchNewVideo();  // Fetch more videos if at the end of the list
                }
            } else if (event.deltaY < 0 && currentVideoIndex > 0) {
                // Scrolling up
                setCurrentVideoIndex((prevIndex) => prevIndex - 1);  // Move to previous video
            }
        };

        window.addEventListener('wheel', handleWheel);

        return () => window.removeEventListener('wheel', handleWheel);
    }, [currentVideoIndex, mpdUrl, isFetching]);

    // Play/Pause toggle handler
    const togglePlayPause = () => {
        if (playerRef.current && playerRef.current.isReady()) {
            if (isPlaying) {
                playerRef.current.pause();
                console.log("Pausing video");
            } else {
                playerRef.current.play();
                console.log("Playing video");
            }
            setIsPlaying(!isPlaying); // Toggle the playing state
        } else {
            console.error("Player is not ready yet");
        }
    };

    
    
    useEffect(() => {
        if (mpdUrl[currentVideoIndex]) {
            loadVideo(currentVideoIndex);
        }
    
        return () => {
            if (playerRef.current) {
                console.log("Resetting Dash.js player");
                playerRef.current.reset();
                playerRef.current = null;
            }
        };
    }, [currentVideoIndex, mpdUrl]);
    
    

    return (
        <div id="video-container">
            <div id="video-container-elements"> 
                <video ref={videoElementRef} id="videoPlayer" width={640} height={360} controls></video>
                <div id="videoController" className="video-controller unselectable">
                <div id="playPauseBtn" className="btn-play-pause" title="Play/Pause" onClick={togglePlayPause}>
                    <span id="iconPlayPause" className={isPlaying ? "icon-pause" : "icon-play"}></span>
                </div>


                    <span id="videoTime" className="time-display">00:00:00</span>



                    <button id="likeBtn" className="btn-like control-icon-layout" title="Like" onClick={handleLike}>
                        <span className="icon-like"></span> {likeCount} Like
                    </button>
                    <button id="thumbsDownBtn" className="btn-thumbs-down control-icon-layout" title="Dislike" onClick={handleDislike}>
                        <span className="icon-thumbs-down"></span> Dislike
                    </button>

                    <div id="viewCount" className="view-count control-icon-layout" title="Views">
                        <span className="icon-view"></span>
                        <span className="view-count-text">0</span> {/* Default view count */}
                    </div>




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
