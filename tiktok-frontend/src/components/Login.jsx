import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage({setAuth}) {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault(); // Prevent page reload

        try {
            const res = await axios.post('/api/login', { username, password });

            // Debugging response
            console.log('API Response:', res.data);

            // Navigate to the home page if login is successful
            if (res.data.error === undefined) {
                console.log('Login successful');
                window.location.reload()
                // setAuth(true);
                // navigate(0);; // Redirect to home page
            } else {
                setErrorMessage(res.data.message || 'Login failed. Please try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            setErrorMessage('An error occurred during login.');
        }
    };

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
            <form onSubmit={handleLogin}>
                <label htmlFor="username">Username:</label>
                <br />
                <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <br />

                <label htmlFor="password">Password:</label>
                <br />
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <br />

                {/* Display error messages */}
                {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

                <button type="submit">Login</button>
            </form>
        </div>
    );
}

export default LoginPage;