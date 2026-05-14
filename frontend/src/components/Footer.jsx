import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full py-stack-xl px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-stack-md bg-surface-container-lowest dark:bg-primary-container border-t border-border-subtle dark:border-outline/10 mt-auto">
      <div className="flex flex-col items-center md:items-start gap-stack-xs">
        <span className="text-body-lg font-headline-md font-bold text-primary dark:text-on-primary-fixed">Chem Vision AI</span>
        <p className="text-body-md font-body-md text-secondary-fixed-dim dark:text-secondary-fixed-dim">© 2024 Chem Vision AI. Discover Molecules Instantly.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-stack-md text-label-sm font-label-sm">
        <a className="text-on-surface-variant dark:text-on-surface-variant hover:text-secondary dark:hover:text-secondary-fixed hover:underline transition-all opacity-80" href="#">Terms of Service</a>
        <a className="text-on-surface-variant dark:text-on-surface-variant hover:text-secondary dark:hover:text-secondary-fixed hover:underline transition-all opacity-80" href="#">Privacy Policy</a>
        <a className="text-on-surface-variant dark:text-on-surface-variant hover:text-secondary dark:hover:text-secondary-fixed hover:underline transition-all opacity-80" href="#">Contact Support</a>
        <a className="text-on-surface-variant dark:text-on-surface-variant hover:text-secondary dark:hover:text-secondary-fixed hover:underline transition-all opacity-80" href="#">Status</a>
      </div>
    </footer>
  );
};

export default Footer;
