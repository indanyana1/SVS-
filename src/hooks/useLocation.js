import { useMemo } from 'react';

const useLocation = () => {
  return useMemo(() => ({ city: '', country: '' }), []);
};

export default useLocation;
