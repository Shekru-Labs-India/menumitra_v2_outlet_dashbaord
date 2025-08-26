import { STATISTICS_PREFIX, isDev } from './apiConfig';

// Use the STATISTICS_PREFIX as the API endpoint
const apiEndpoint = STATISTICS_PREFIX;

// App version with environment indicator
const APP_VERSION = "1.0.1";
const ENV_INDICATOR = isDev ? "(DEV)" : "";

export { apiEndpoint };

export const menuMitraCompanyInfo = {
  name: "Shekru Labs India Pvt. Ltd.",
  website: "https://shekruweb.com/",
  version: APP_VERSION,
};

export const menuMitraSocialLinks = [
  {
    name: "Facebook",
    url: "https://www.facebook.com/share/x5wymXr6w7W49vaQ/?mibextid=qi2Omg",
    icon: "ri-facebook-fill fs-4",
    btnClass: "btn-text-facebook",
  },

  {
    name: "Instagram",
    url: "https://www.instagram.com/menumitra/",
    icon: "ri-instagram-fill fs-4", // ✅ Remix Icon
    btnClass: "btn-text-instagram",
  },

  {
    name: "YouTube",
    url: "https://www.youtube.com/@menumitra",
    icon: "ri-youtube-fill fs-4",
    btnClass: "btn-text-youtube",
  },
  {
    name: "Google",
    url: "https://www.google.com/menumitra/",
    icon: "ri-google-fill fs-4",
    btnClass: "btn-text-google",
  },

];

export const menuMitraAppInfo = {
  name: "MenuMitra",
  title: ` Statistics Dashboard ${ENV_INDICATOR}`,
  version: APP_VERSION,
  logo: {
    width: "60px",
    height: "60px",
  },
}; 