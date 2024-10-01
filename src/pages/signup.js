import React from 'react';

const SignUpPage = function(){
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
    <form action="/adduser" method="POST">
        <label htmlFor="username">Username:</label>
        <br></br>
        <input type="text" id="username" name="username" required></input> <br></br>
        
        <label htmlFor="password">Password:</label><br></br>
        <input type="password" id="password" name="password" required></input> <br></br>
        
        <label htmlFor="email">Email:</label><br></br>
        <input type="email" id="email" name="email" required></input>
        <br></br>
        <button type="submit">Submit</button>
    </form>
    </div>
  )
}

// export const getServerSideProps = async (context) => {
//   const { name } = context.query; // Get query parameter from context
//   return { props: { name } }; // Pass it to the component as a prop
// };

export default SignUpPage;


