import { useMemo, useState } from 'react';

export const useGlobalStore = () => {
  const [state, setState] = useState({
    cart: [],
    search: '',
  });

  return useMemo(() => ({ state, setState }), [state]);
};
