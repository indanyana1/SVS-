import React from 'react';
import PropTypes from 'prop-types';

const BackgroundImageWrapper = ({ imageUrl, children }) => {
  return (
    <div
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        width: '100%',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: -1,
      }}
    >
      {children}
    </div>
  );
};

BackgroundImageWrapper.propTypes = {
  imageUrl: PropTypes.string.isRequired,
  children: PropTypes.node,
};

export default BackgroundImageWrapper;