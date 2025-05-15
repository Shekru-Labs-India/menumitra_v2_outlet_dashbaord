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
    icon: "fa-brands fa-facebook fs-4",
    btnClass: "btn-text-facebook",
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/102429337/admin/dashboard/",
    icon: "fa-brands fa-linkedin fs-4",
    btnClass: "btn-text-linkedin",
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/@menumitra",
    icon: "fa-brands fa-youtube fs-4",
    btnClass: "btn-text-youtube",
  },
  {
    name: "Telegram",
    url: "https://t.me/MenuMitra",
    icon: "fa-brands fa-telegram fs-4",
    btnClass: "btn-text-telegram",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/menumitra/",
    icon: "fa-brands fa-instagram fs-4",
    btnClass: "btn-text-instagram",
  },
];

export const menuMitraAppInfo = {
  name: "MenuMitra",
  title: `MenuMitra Statistics Dashboard ${ENV_INDICATOR}`,
  version: APP_VERSION,
  logo: {
    width: "60px",
    height: "60px",
  },
}; 