import React from 'react';

const LoginPage = function(){
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
    <form action="/login" method="POST">
        <label htmlFor="username">Username:</label>
        <br></br>
        <input type="text" id="username" name="username" required></input> <br></br>
        
        <label htmlFor="password">Password:</label><br></br>
        <input type="password" id="password" name="password" required></input> <br></br>
        <br></br>
        <button type="submit">Submit</button>
    </form>
    </div>
  )
}

export default LoginPage;


