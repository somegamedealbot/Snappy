import { useState, useEffect, useRef } from 'react';
import { useLoaderData } from 'react-router-dom';
import axios from 'axios';
import Video from './Video.jsx';
import '../css/controlbar.css';

function Player() {
    const baseURL = 'http://wbill.cse356.compas.cs.stonybrook.edu';
    const initialUrls = useLoaderData(); // Initial array of video URLs
    const [mpdUrls, setMpdUrls] = useState(initialUrls);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    // Function to update the browser URL to match the current video URL
    const updateBrowserUrl = (index) => {
        const currentVideoUrl = mpdUrls[index];
        const id = currentVideoUrl.split('/').pop();
        const newUrl = `${baseURL}/play/${id}`;
        window.history.replaceState(null, '', newUrl);
    };

    const markVideoAsViewed = async (videoId) => {
        try {
            const response = await axios.post('/api/view', { id: videoId });
            if (response.data.viewed === false) {
                // setViewedVideos((prev) => new Set(prev).add(videoId)); // Add to viewed set if new
                console.log(`Video ${videoId} marked as viewed`);
            }
            
        } catch (error) {
            console.error('Error marking video as viewed:', error);
        }
    };
    // Function to fetch a new video URL from the API
    const fetchNewVideo = async () => {
        try {
            const count = 1;
            const response = await axios.post(`${baseURL}/api/videos`, {count});
            const newVideoUrl = response.data.videos[0];
            const videoUrls = `${baseURL}/api/manifest/${newVideoUrl.id}`
            // Check if the URL is already in the list to avoid duplicates
            if (!mpdUrls.includes(videoUrls)) {
                setMpdUrls((prevUrls) => [...prevUrls, videoUrls]);
            }
        } catch (error) {
            console.error("Failed to fetch new video:", error);
        }
    };

    const isCooldownRef = useRef(false);
    const cooldownTime = 50

    // Function to handle mouse wheel scroll for changing videos
    const handleWheelScroll = async (event) => {

        if (isCooldownRef.current) return; // If still in cooldown, exit early

        if (event.deltaY > 0) {
            // Scroll down, show next video
            await fetchNewVideo(); // Fetch a new video URL every time you scroll down
            // console.log(mpdUrls)
            const url = mpdUrls[currentVideoIndex];
            const id = url.split('/').pop()
            await markVideoAsViewed(id)
            setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % mpdUrls.length);
            
        } else {
            // Scroll up, show previous video
            if(currentVideoIndex > 0){
                setCurrentVideoIndex((prevIndex) => (prevIndex - 1 + mpdUrls.length) % mpdUrls.length);
            }
        }

        // console.log('enter cooldown');
        isCooldownRef.current = true; // Start cooldown

        setTimeout(() => {
            // console.log('reset');
            isCooldownRef.current = false; // End cooldown after specified time
        }, cooldownTime);
    };

    // Update the browser URL whenever the current video changes
    useEffect(() => {
        updateBrowserUrl(currentVideoIndex);
    }, [currentVideoIndex]);

    // Attach wheel event listener to the window
    useEffect(() => {
        window.addEventListener('wheel', handleWheelScroll);
        return () => {
            window.removeEventListener('wheel', handleWheelScroll);
        };
    }, [currentVideoIndex]);

    return (
        <div className="player-container">
            {/* Render only the currently selected video */}
            {mpdUrls.map((url, index) => (
                <div key={url} style={{ display: currentVideoIndex === index ? 'block' : 'none' }}>
                    <Video videoURL={url} index={index} button= {currentVideoIndex === index}/>
                </div>
            ))}

            {/* Display current video index */}
            <div className="video-indicator">
                {`Video ${currentVideoIndex + 1} of ${mpdUrls.length}`}
            </div>
        </div>
    );
}

export default Player;