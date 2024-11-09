import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Upload = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [file, setFile] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');

    // Handle file input change
    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    // Handle form submission
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!file || !title || !author) {
            setStatusMessage("All fields are required!");
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('author', author);
        formData.append('mp4File', file);

        try {
            // POST request to upload the video
            const response = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'X-CSE356': '<YOUR_COURSE_ID>' // Replace with your actual course ID
                }
            });

            if (response.data.status === 'ERROR') {
                setStatusMessage(response.data.message);
            } else {
                setStatusMessage('Video uploaded successfully!');
                setTitle('');
                setAuthor('');
                setFile(null);
                navigate('/'); // Redirect to homepage after successful upload
            }
        } catch (error) {
            console.error("Error uploading video:", error);
            setStatusMessage('Error uploading video. Please try again.');
        }
    };

    return (
        <div className="upload-container">
            <h2>Upload a New Video</h2>
            <form onSubmit={handleSubmit} className="upload-form">
                <div>
                    <label htmlFor="title">Title:</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="author">Author:</label>
                    <input
                        type="text"
                        id="author"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="file">Select MP4 File:</label>
                    <input
                        type="file"
                        id="file"
                        accept=".mp4"
                        onChange={handleFileChange}
                        required
                    />
                </div>
                <button type="submit">Upload</button>
            </form>
            {statusMessage && <p>{statusMessage}</p>}
        </div>
    );
};

export default Upload;
