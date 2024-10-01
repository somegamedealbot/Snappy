const nodemailer = require("nodemailer");
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'postfix',
    port: 25,
    secure: false, 
    tls: {
        rejectUnauthorized: false
    },
    debug: true,
    logger: true
});

console.log('Transport Created');

const sendMail = async (destEmail, key) =>{

    const url = new URL(`http://localhost:${process.env.PORT}?`);
    url.searchParams.append('email', destEmail);
    url.searchParams.append('key', key);
    // const url = new URL('http://wbill.cse356.compas.cs.stonybrook.edu:')

    const info = await transporter.sendMail({
        from: 'no-reply@wbill.cse356.compas.cs.stonybrook.edu', // sender address
        to: destEmail, // list of receivers
        subject: "Verify Email for WarmUp", // Subject line
        text: `Please verify your email by clicking on the following link: ${url.toString()}`, // plain text body
        // html: "<b>Hello world?</b>", // html body
    });
    
    console.log(info);
}

module.exports ={
    sendMail  
};