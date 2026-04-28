module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    /* The app is always rendered at a fixed 1280px virtual desktop width
       (it is then transform: scaled down to fit the device). To make sure
       every responsive utility (sm:, md:, lg:, xl:, 2xl:) fires inside
       that virtual viewport, we collapse all breakpoints to 0px so they
       always apply — effectively giving every screen the desktop layout. */
    screens: {
      sm: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
      '2xl': '0px',
    },
    extend: {},
  },
  plugins: [],
};
