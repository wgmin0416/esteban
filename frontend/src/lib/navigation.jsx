let navigateFn = null;

export const setNavigator = (navigate) => {
  navigateFn = navigate;
};

export const navigateTo = (...args) => {
  if (!navigateFn) {
    console.warn('navigate function is not set yet');
    return;
  }
  navigateFn(...args);
};
