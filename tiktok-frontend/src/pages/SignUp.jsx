import {useState} from 'react';

function SignUp() {
    return (<>
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <form action="/adduser" method="POST">
            <label htmlFor="username">Username:</label>
            <br></br>
            <input type="text" id="username" name="username" required></input> <br></br>
            
            <label htmlFor="username">Email:</label>
            <br></br>
            <input type="text" id="email" name="email" required></input> <br></br>

            <label htmlFor="password">Password:</label><br></br>
            <input type="password" id="password" name="password" required></input> <br></br>
            <br></br>
            <button type="submit">Login</button>
            <br></br>
            <a href='/login'><div>Login</div></a>
        </form>
        </div>
    </>)
}

export default SignUp;