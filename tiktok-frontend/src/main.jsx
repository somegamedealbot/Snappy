import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider} from "react-router-dom";
import RootPage from './pages/Root.jsx'
import SignUp from './pages/SignUp.jsx';
import Player from './components/Player';
import Upload from './pages/Upload.jsx';
import axios from 'axios';

const baseURL = "https://wbill.cse356.compas.cs.stonybrook.edu";
const folder = '../var/www/media'
axios.defaults.baseURL = baseURL;

const InitializedArray = [];

const router = createBrowserRouter([
  {
    path: "/",
    loader: async ({params}) => {
      const count = 10;
      try{
        const response = await axios.post(`${baseURL}/api/videos`, { count });
        const videoObjects = response.data.videos;
        console.log(videoObjects);
        return videoObjects ? videoObjects : null;
      }catch(error){
        console.error("Error fetching video URLs", error);
        return null;
        // throw new Error("Failed to load video URLs");
      }
    },
    element: <RootPage></RootPage>
  }, 
  // {
  //   path: "/login",
  //   element: <LoginPage></LoginPage>
  // },
  {
    path: "/signup",
    element: <SignUp></SignUp>
  },
  {
    path: "/play/:id",
    loader: async ({params}) => {
      const count = 4;
      try{
        const response = await axios.post(`${baseURL}/api/videos`, { count });
        const videoObjects = response.data.videos;
        const videoUrls = videoObjects.map(video => `${baseURL}/api/manifest/${video.id}`)
        const videoArray = [`${baseURL}/api/manifest/${params.id}`, ...videoUrls];
        // console.log(videoArray)
        return videoArray;
      }catch(error){
        console.error("Error fetching video URLs", error);
        // throw new Error("Failed to load video URLs");
        return null;
      }
    },
    element: <Player></Player>
  }, 
  {
    path: "/upload",
    element: <Upload></Upload>
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}></RouterProvider>
  </StrictMode>,
)
