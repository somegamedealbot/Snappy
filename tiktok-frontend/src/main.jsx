import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider} from "react-router-dom";
import './index.css'
import RootPage from './pages/Root.jsx'
import LoginPage from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx';
import Player from './components/Player';
import axios from 'axios';

const baseURL = "http://wbill.cse356.compas.cs.stonybrook.edu";
axios.defaults.baseURL = baseURL;

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootPage></RootPage>
  }, 
  {
    path: "/login",
    element: <LoginPage></LoginPage>
  },
  {
    path: "/signup",
    element: <SignUp></SignUp>
  },
  {
    path: "/play/:id",
    loader: async ({params}) => {
      return `${baseURL}/api/manifest/${params.id}`;
    },
    element: <Player></Player>
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router}></RouterProvider>
  </StrictMode>,
)
