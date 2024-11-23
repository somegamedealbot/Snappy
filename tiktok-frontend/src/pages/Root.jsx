import { useLoaderData, Link } from 'react-router-dom';
import '../css/controlbar.css'; // Import the CSS for the grid layout
import { useEffect, useState } from 'react';
import axios from 'axios';
import LoginPage from '../components/Login.jsx';
// import  from './Login';

function Root() {
  const mpdUrl = useLoaderData();
  const [auth, setAuth] = useState(false); 
  useEffect(() => {
    axios.post('/api/check-auth')
    .then((res) => {
      if (res.data.isLoggedIn === true){
        setAuth(true);
      }
      else {
        setAuth(false);
      }
    })
    .catch((err) => {
      console.log(err);
    })
  }, [auth]);
  
  if (auth) {
    return (
      <div className="thumbnail-grid">
        {mpdUrl.map((thumbnailObject, index) => (
          <div className="thumbnail-item" key={index}>
            <Link to={`/play/${thumbnailObject.id}`}>
              <img
                src={`https://wbill.cse356.compas.cs.stonybrook.edu/api/thumbnail/${thumbnailObject.id}`}
                alt={thumbnailObject.title}
              />
            </Link>
            <h1>{thumbnailObject.title}</h1>
            <h2>{thumbnailObject.description}</h2>
          </div>
        ))}
      </div>
    );
  }
  else {
    return <LoginPage setAuth={setAuth}></LoginPage>
  }
}

export default Root;
