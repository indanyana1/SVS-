const SELLER_SIGNUP_DRAFT_STORAGE_KEY = 'svs-seller-signup-draft';

const isBrowser = typeof window !== 'undefined';

const getPendingSellerSignupDraft = () => {
  if (!isBrowser) {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(SELLER_SIGNUP_DRAFT_STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : null;
  } catch {
    return null;
  }
};

const savePendingSellerSignupDraft = (draft) => {
  if (!isBrowser) {
    return;
  }

  window.localStorage.setItem(SELLER_SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify(draft));
};

const clearPendingSellerSignupDraft = () => {
  if (!isBrowser) {
    return;
  }

  window.localStorage.removeItem(SELLER_SIGNUP_DRAFT_STORAGE_KEY);
};

export {
  SELLER_SIGNUP_DRAFT_STORAGE_KEY,
  clearPendingSellerSignupDraft,
  getPendingSellerSignupDraft,
  savePendingSellerSignupDraft,
};