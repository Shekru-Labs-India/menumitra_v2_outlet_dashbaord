import React from 'react';
import { menuMitraAppInfo, menuMitraSocialLinks } from '../config/menuMitraConfig';
import logo from "../assets/img/company/MenuMitra_logo.png";

const Footer = () => {
  return (
    <footer className="content-footer footer bg-footer-theme py-4">
      <div className="container-xxl d-flex flex-column flex-md-row justify-content-between align-items-center">
        
        {/* Logo + App Name */}
        <div className="d-flex align-items-center mb-3 mb-md-0">
          <img
            src={logo}
            alt="MenuMitra Logo"
            width={menuMitraAppInfo.logo.width}
            height={menuMitraAppInfo.logo.height}
            className="me-2"
          />
          <span className="fw-bold fs-5">{menuMitraAppInfo.name}</span>
        </div>

        {/* Social Media Icons */}
        <div className="social-icons d-flex gap-3 mb-3 mb-md-0">
          {menuMitraSocialLinks.slice(0, 3).map((social, index) => (
            <a
              key={index}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`social-btn ${social.btnClass}`}
              style={{ fontSize: "1.4rem" }}
            >
              <i className={social.icon}></i>
            </a>
          ))}
        </div>

        {/* Version + Credit */}
        <div className="text-center text-md-end">
          <div className="text-body small mb-1">
            © {menuMitraAppInfo.name}, {" "}
            <a
              href="https://shekruweb.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link text-danger"
            >
            </a>
          </div>

        </div>

      </div>
    </footer>
  );
};

export default Footer;
